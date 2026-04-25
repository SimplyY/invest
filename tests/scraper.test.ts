import { describe, expect, it, vi } from "vitest";
import { scrapeMacroData } from "../src/scraper.js";

describe("scrapeMacroData", () => {
  it("parses macro data from html with nested tags", async () => {
    const html = `
      <html>
        <body>
          <section>
            <h2>宏观数据</h2>
            <div>
              <span>债市温度</span>
              <strong>78°</strong>
              <span>10年期国债到期收益率</span>
              <em>1.78%</em>
              <span>2026年4月14日</span>
            </div>
          </section>
        </body>
      </html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => html,
      }),
    );

    const result = await scrapeMacroData();

    expect(result.temperature).toBe(78);
    expect(result.yieldRate).toBe(1.78);
    expect(result.dataDate).toBe("2026年4月14日");

    vi.unstubAllGlobals();
  });
});
