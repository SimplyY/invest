interface FeishuWebhookPayload {
  msg_type: "text" | "post";
  content:
    | {
        text: string;
      }
    | {
        post: {
          zh_cn: {
            title: string;
            content: Array<Array<{ tag: "text"; text: string }>>;
          };
        };
      };
}

function buildMarkdownPost(title: string, markdown: string): FeishuWebhookPayload {
  return {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title,
          content: markdown.split("\n").map((line) => [{ tag: "text", text: line }]),
        },
      },
    },
  };
}

export async function sendFeishuMarkdown(
  webhookUrl: string,
  title: string,
  markdown: string,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(buildMarkdownPost(title, markdown)),
  });

  if (!response.ok) {
    throw new Error(`飞书 webhook 调用失败: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { code?: number; msg?: string };
  if (payload.code !== undefined && payload.code !== 0) {
    throw new Error(`飞书 webhook 返回异常: ${payload.msg ?? payload.code}`);
  }
}
