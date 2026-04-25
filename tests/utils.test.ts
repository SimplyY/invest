import { describe, expect, it } from "vitest";
import { displayWidth, padToDisplayWidth, truncateToDisplayWidth } from "../src/utils.js";

describe("displayWidth", () => {
  it("counts CJK as width 2", () => {
    expect(displayWidth("基金")).toBe(4);
    expect(displayWidth("a")).toBe(1);
    expect(displayWidth("a中")).toBe(3);
  });
});

describe("padToDisplayWidth", () => {
  it("pads left or right to target display width", () => {
    expect(displayWidth("卖出")).toBe(4);
    expect(padToDisplayWidth("卖出", 6, "left")).toBe("卖出  ");
    expect(padToDisplayWidth("5万", 6, "right")).toBe("   5万");
  });
});

describe("truncateToDisplayWidth", () => {
  it("adds ellipsis when truncating", () => {
    expect(truncateToDisplayWidth("一二三四五六", 5)).toBe("一二…");
  });
});
