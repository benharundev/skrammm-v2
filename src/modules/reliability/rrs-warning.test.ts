import { describe, it, expect } from "vitest";
import { getRrsV2WarningLevel } from "./index";

describe("getRrsV2WarningLevel", () => {
  it("returns green for score >= 50", () => {
    expect(getRrsV2WarningLevel(50)).toBe("green");
    expect(getRrsV2WarningLevel(82.5)).toBe("green");
  });
  it("returns yellow for score >= 30 and < 50", () => {
    expect(getRrsV2WarningLevel(30)).toBe("yellow");
    expect(getRrsV2WarningLevel(49.9)).toBe("yellow");
  });
  it("returns red for score < 30", () => {
    expect(getRrsV2WarningLevel(0)).toBe("red");
    expect(getRrsV2WarningLevel(29.9)).toBe("red");
  });
});
