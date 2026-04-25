# 自动化上线清单

## 当前最终方案

现在已经确认的最终通知方案是：

- 飞书群
- 群里的自定义机器人
- 通过 webhook 推送消息

不再继续推进飞书私聊版。

## 当前目标

先把下面这条链路稳定跑通：

GitHub Actions 定时执行 -> 抓取数据 -> 生成策略 -> 推送到飞书群机器人

### 你在 GitHub 要做的

1. 把仓库推到 GitHub
2. 打开仓库 `Settings`
3. 进入 `Secrets and variables -> Actions`
4. 创建仓库级 Secret：`FEISHU_WEBHOOK_URL`
5. 确认 Actions 已启用
6. 手动触发一次 `.github/workflows/investment_bot.yml`

当前工作流会从 `secrets.FEISHU_WEBHOOK_URL` 读取 webhook，这一点已经写在 [investment_bot.yml](/Users/yuwei/Documents/code/invest/.github/workflows/investment_bot.yml:1)。

GitHub Secrets 参考官方文档：

- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)

### 你在飞书要做的

1. 建一个飞书群
2. 把你自己加进去
3. 给这个群添加自定义机器人
4. 取到 webhook
5. 把 webhook 填到 GitHub Secret 和本地 `.env.local`

### 你要提供给我什么

如果只做群机器人：

- 不需要给我真实密钥
- 你自己把 webhook 放到 `.env.local` 或 GitHub Secret 即可
- 你只需要告诉我“已经配好，可以继续”

## 建议执行顺序

建议按这个顺序做：

1. 本地跑通 `npm run start:dry`
2. 本地跑通群机器人版本 `npm run start`
3. GitHub Actions 跑通群机器人版本

这样定位问题会清楚得多：

- 抓取问题
- 策略问题
- GitHub 调度问题
- 飞书 webhook 问题

它们不会混在一起。

## 关于 GitHub 这边我能做什么

如果当前本地仓库已经连上远程 GitHub 仓库，并且我能看到那个仓库，我可以继续帮你处理仓库内相关工作。

但目前这份工作区有两个现实限制：

1. 本地 `git remote -v` 还是空的
2. 我当前拿到的 GitHub 连接器没有返回任何可访问仓库

所以我现在还不能直接替你把 Secret 配到具体仓库上。

## 你现在只需要补齐什么

要继续推进自动化，你只需要把这一步补上：

1. 当前本地仓库连到一个真实 GitHub 远程仓库

一旦这一步完成，我就能继续帮你确认 GitHub Actions 的落地细节。
