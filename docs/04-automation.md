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
5. 创建仓库级 Secret：`PORTFOLIO_JSON`
6. 创建仓库级 Secret：`STRATEGY_JSON`
7. 创建仓库级 Variable：`STATE_JSON`
8. 确认 Actions 已启用
9. 手动触发一次 `.github/workflows/investment_bot.yml`

推荐的 `STATE_JSON` 初始值：

```json
{"lastTriggeredBandId":null,"lastRunAt":null,"lastObservedTemperature":null,"lastObservedYieldRate":null}
```

当前工作流会：

- 从 `secrets.FEISHU_WEBHOOK_URL` 读取 webhook
- 从 `secrets.PORTFOLIO_JSON` 和 `secrets.STRATEGY_JSON` 恢复真实配置
- 从 `vars.STATE_JSON` 恢复上次状态
- 运行结束后把新的 `state.json` 自动回写到 `STATE_JSON`

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

组合与策略配置也不需要再提交到仓库：

- 本地：编辑被忽略的 `data/portfolio.json` 和 `data/strategy.json`
- GitHub：把这两个文件的完整 JSON 内容分别放进 `PORTFOLIO_JSON` / `STRATEGY_JSON`
- `state.json` 本地首次运行会自动生成，GitHub 由 `STATE_JSON` variable 持久化

## 建议执行顺序

建议按这个顺序做：

1. 本地跑通 `npm run start:dry`
2. 首次执行 `npm run config:init`
3. 本地跑通群机器人版本 `npm run start`
4. GitHub Actions 跑通群机器人版本

这样定位问题会清楚得多：

- 抓取问题
- 策略问题
- GitHub 调度问题
- 飞书 webhook 问题

它们不会混在一起。

## 本地与 GitHub 的配置优先级

运行时的配置优先级是：

1. 环境变量直接注入：`PORTFOLIO_JSON / STRATEGY_JSON / STATE_JSON`
2. 本地文件：`data/portfolio.json / data/strategy.json / state.json`
3. 示例文件提示

所以本地和 GitHub 现在已经是同一套注入思路，只是载体不同：

- 本地更适合编辑忽略文件
- GitHub 更适合通过 Secret / Variable 恢复
