from concurrent.futures import ThreadPoolExecutor
from threading import RLock

from .core import all_records, get, now, save, settings

executor = ThreadPoolExecutor(max_workers=settings.task_workers)
lock = RLock()


class Cancelled(Exception):
    pass


def checkpoint(task_id, stage):
    with lock:
        task = get(task_id, "task")
        if task.get("cancel_requested"):
            raise Cancelled()
        save("task", {**task, "stage": stage}, task_id)


def run(task_id, work):
    with lock:
        task = get(task_id, "task")
        save("task", {**task, "status": "running", "started_at": now()}, task_id)
    try:
        checkpoint(task_id, "Preparation")
        result = work(lambda stage: checkpoint(task_id, stage))
        checkpoint(task_id, "Finalizing")
        status, error = "complete", None
    except Cancelled:
        result, status, error = (
            None,
            "cancelled",
            {
                "code": "cancelled",
                "message": "Cancelled. In-flight calls may have completed; no further stages were started.",
            },
        )
    except Exception as exc:  # noqa: BLE001 - persist worker failures without leaking SDK payloads
        result, status = None, "failed"
        # Known validation errors are safe; SDK/network details can include sensitive input.
        message = (
            str(exc)
            if type(exc) is ValueError and len(str(exc)) < 400
            else "External service or processing failed. Check configuration and retry explicitly."
        )
        error = {"code": "task_failed", "message": message}
    with lock:
        task = get(task_id, "task")
        # Cancellation may arrive between the last checkpoint and terminal save.
        if status == "complete" and task.get("cancel_requested"):
            result, status = None, "cancelled"
            error = {"code": "cancelled", "message": "Cancelled before publishing the completed report."}
        finished_at = now()
        if task.get("analysis_id"):
            a = get(task["analysis_id"], "analysis")
            save("analysis", {**a, "status": status, "error": error, "finished_at": finished_at}, a["id"])
        # Pollers must never observe a complete task with an unfinished report.
        save(
            "task",
            {**task, "status": status, "result": result, "error": error, "finished_at": finished_at},
            task_id,
        )


def ensure_capacity():
    """Call under lock before creating an analysis or enqueuing its task."""
    if sum(t["status"] in {"queued", "running"} for t in all_records("task")) >= settings.task_workers * 4:
        raise ValueError("Task queue is full. Wait for a task to finish.")


def submit(kind, key, work, analysis_id=None):
    with lock:
        duplicate = next((t for t in all_records("task") if t["key"] == key), None)
        if duplicate:
            return duplicate
        ensure_capacity()
        t = save(
            "task",
            {
                "type": kind,
                "key": key,
                "analysis_id": analysis_id,
                "status": "queued",
                "stage": "Queued",
                "created_at": now(),
                "error": None,
            },
        )
        executor.submit(run, t["id"], work)
        return t


def recover():
    for t in all_records("task"):
        if t["status"] in {"queued", "running"}:
            error = {
                "code": "interrupted",
                "message": "Server restarted. Retry explicitly; external calls may have completed.",
            }
            save("task", {**t, "status": "interrupted", "error": error, "finished_at": now()}, t["id"])
            if t.get("analysis_id"):
                a = get(t["analysis_id"])
                save("analysis", {**a, "status": "interrupted", "error": error}, a["id"])
    for s in all_records("snapshot"):
        if s["status"] == "importing":
            save("snapshot", {**s, "status": "incomplete"}, s["id"])
