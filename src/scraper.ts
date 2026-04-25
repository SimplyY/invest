import { DATA_PAGE_URL, USER_AGENT } from "./config.js";
import type { ScrapedSnapshot } from "./types.js";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&ensp;|&emsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToVisibleText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
}

function extractTemperatureAndYieldFromInlineJson(html: string): ScrapedSnapshot | null {
  const jsonScriptMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g,
  );

  for (const match of jsonScriptMatches) {
    const candidate = match[1];
    if (!candidate || !candidate.includes("债市温度")) {
      continue;
    }

    const extracted = extractTemperatureAndYieldFromText(candidate);
    if (extracted) {
      return extracted;
    }
  }

  return null;
}

function extractTemperatureAndYieldFromText(text: string): ScrapedSnapshot | null {
  const normalized = text.replace(/\s+/g, " ");
  const macroAnchorIndex = normalized.indexOf("债市温度");
  const relevantText =
    macroAnchorIndex >= 0 ? normalized.slice(macroAnchorIndex, macroAnchorIndex + 300) : normalized;
  const temperatureMatch = relevantText.match(/债市温度[^0-9]{0,20}(\d+(?:\.\d+)?)\s*°?/);
  const yieldMatch = relevantText.match(
    /10年期国债(?:到期)?收益率[^0-9]{0,20}(\d+(?:\.\d+)?)\s*%?/,
  );
  const dateMatch = relevantText.match(/([0-9]{4}年[0-9]{1,2}月[0-9]{1,2}日)/);

  if (!temperatureMatch || !yieldMatch || !dateMatch) {
    return null;
  }

  return {
    temperature: Number(temperatureMatch[1]),
    yieldRate: Number(yieldMatch[1]),
    dataDate: dateMatch[1] ?? "",
    sourceUrl: DATA_PAGE_URL,
  };
}

function discoverApiHints(html: string): string[] {
  const hints = new Set<string>();
  const urlMatches = html.matchAll(/https?:\/\/[^"')\s]+|\/api\/[^"')\s]+/g);

  for (const match of urlMatches) {
    const value = match[0];
    if (value.includes("api") || value.includes("graphql")) {
      hints.add(value);
    }
  }

  return [...hints];
}

export async function scrapeMacroData(): Promise<ScrapedSnapshot> {
  const response = await fetch(DATA_PAGE_URL, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`抓取目标页面失败: HTTP ${response.status}`);
  }

  const html = await response.text();

  const apiHints = discoverApiHints(html);
  for (const hint of apiHints) {
    if (!hint.startsWith("http")) {
      continue;
    }

    try {
      const hintedResponse = await fetch(hint, {
        headers: {
          "user-agent": USER_AGENT,
          accept: "application/json,text/plain,*/*",
        },
      });

      if (!hintedResponse.ok) {
        continue;
      }

      const hintedText = await hintedResponse.text();
      const hintedData = extractTemperatureAndYieldFromText(hintedText);
      if (hintedData) {
        return hintedData;
      }
    } catch {
      // Ignore unstable hinted endpoints and fall back to DOM/text extraction.
    }
  }

  const inlinePayload = extractTemperatureAndYieldFromInlineJson(html);
  if (inlinePayload) {
    return inlinePayload;
  }

  const textPayload = extractTemperatureAndYieldFromText(htmlToVisibleText(html));
  if (textPayload) {
    return textPayload;
  }

  const domFallback = extractTemperatureAndYieldFromText(html);
  if (domFallback) {
    return domFallback;
  }

  throw new Error("未能从页面中解析出债市温度和 10 年期国债到期收益率。");
}
