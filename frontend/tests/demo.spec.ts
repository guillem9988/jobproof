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

test("cover letter generation and interactive mock interview chat", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try fixture demo" }).click();
  await page.getByRole("button", { name: "Analyze evidence" }).click();
  await expect(
    page.getByRole("heading", { name: "Requirements & evidence" }),
  ).toBeVisible({ timeout: 20000 });

  // 1. Cover Letter Tab
  await page.getByRole("tab", { name: "Cover Letter" }).click();
  await expect(
    page.getByRole("heading", { name: "Honest Evidence Cover Letter" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate Cover Letter" }).first().click();
  await expect(page.locator(".cover-letter-card")).toBeVisible();
  await expect(page.locator(".cover-letter-body")).toContainText("SignalBoard");
  await expect(page.locator(".cover-letter-body")).toContainText("app/api.py");

  // 2. Interview Tab & Mock Interview Chat
  await page.getByRole("tab", { name: "Interview Practice Mode" }).click();
  await expect(
    page.getByRole("heading", { name: "Interview Practice Mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start Mock Interview" }).first().click();
  await expect(page.locator(".chat-message.interviewer")).toBeVisible();
  await expect(page.locator(".chat-message.interviewer .chat-bubble")).toContainText(
    "app/api.py",
  );

  // Candidate sends response
  await page
    .getByPlaceholder("Type your answer explaining your technical approach...")
    .fill("I implemented the owner check to protect endpoint data and tested 403.");
  await page.getByRole("button", { name: "Send Answer" }).click();
  await expect(page.locator(".chat-message.candidate")).toBeVisible();

  // Interviewer responds with question 2 and feedback
  await expect(page.locator(".chat-feedback").first()).toBeVisible();
  await expect(page.locator(".chat-message.interviewer")).toHaveCount(2);

  // Reset interview
  await page.getByTitle("Reset Interview").click();
  await expect(page.locator(".chat-message")).toHaveCount(0);
});

