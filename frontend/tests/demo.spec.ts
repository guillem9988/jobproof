import { test, expect } from "@playwright/test";
test("demo: requirements → analysis → evidence → review → export", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try fixture demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Review the requirements" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyze evidence" }).click();
  await expect(
    page.getByRole("heading", { name: "Requirements & evidence" }),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole("button", { name: /app\/api.py/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Exact citation verified")).toBeVisible();
  await page.getByRole("button", { name: "Close evidence" }).click();
  const card = page.locator(".assessment").filter({
    has: page.getByRole("heading", {
      name: "Python API development",
      exact: true,
    }),
  });
  await card.getByText("Review conclusion", { exact: true }).click();
  await card.getByLabel("Effective conclusion").selectOption("partial");
  await card
    .getByLabel("Reason")
    .fill("I need to explain which parts I implemented.");
  await card.getByRole("button", { name: "Save human review" }).click();
  await expect(
    card.getByText("Human reviewed · Original: Supported"),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Markdown", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
  await page.screenshot({ path: "../docs/report-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Junior product engineer", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../docs/report-mobile.png", fullPage: true });
});
test("untrusted job text renders as text", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New analysis", exact: true }).click();
  await page.getByLabel("Job title").fill("<img src=x onerror=alert(1)>");
  await page
    .getByLabel("Job posting", { exact: true })
    .fill("Required Python. <script>alert(1)</script>");
  await page.getByRole("button", { name: "Save posting" }).click();
  await page.getByText(/Original posting/).click();
  await expect(page.locator(".posting")).toContainText(
    "<script>alert(1)</script>",
  );
  expect(await page.locator(".posting script").count()).toBe(0);
});

test("completed extraction resumes its posting after reload", async ({
  page,
}) => {
  const demo = await page.request
    .post("/api/v1/demo", { data: {} })
    .then((r) => r.json());
  const response = await page.request
    .post(`/api/v1/job-postings/${demo.job_id}/extract-requirements`, {
      data: { mode: "demo", request_id: `reload-${Date.now()}` },
    })
    .then((r) => r.json());
  await page.goto("/");
  await page.evaluate(
    (id) => localStorage.setItem("jobproof-task", id),
    response.id,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review the requirements" }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel("Requirement", { exact: true })).toHaveCount(8);
});
