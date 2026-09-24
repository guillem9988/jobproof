import { describe, it, expect } from "vitest";
import { counts } from "../src/api";
describe("evidence summary", () => {
  it("counts all four states without inventing a percentage", () => {
    expect(
      counts([
        { status: "partial" },
        { status: "supported" },
        { status: "partial" },
      ]),
    ).toEqual([
      { status: "supported", count: 1 },
      { status: "partial", count: 2 },
      { status: "not_evidenced", count: 0 },
      { status: "not_verifiable_from_code", count: 0 },
    ]);
  });
});
