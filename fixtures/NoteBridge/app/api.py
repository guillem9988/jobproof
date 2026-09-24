from fastapi import FastAPI, HTTPException
app = FastAPI()

@app.get("/notes/{note_id}")
def read_note(note_id: int, user):
    note = repository.get(note_id)
    if note["owner_id"] != user.id:
        raise HTTPException(status_code=403)
    return note
