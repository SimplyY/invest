# 投资决策自动化 Agent

这是一个基于 Node.js + TypeScript 的债券投资决策 Agent。

当前仓库已经具备：

- 抓取有知有行债市温度与 10 年期国债收益率
- 基于本地组合和策略配置生成调仓建议
- 本地干跑和温度矩阵调参
- 通过飞书 webhook 发送群机器人消息
- GitHub Actions 定时执行基础工作流

项目细节已经拆到 `docs/` 目录，建议从这里读起：

- [项目总览](./docs/01-overview.md)
- [需求沉淀](./docs/02-requirements.md)
- [策略与配置](./docs/03-strategy.md)
- [自动化上线清单](./docs/04-automation.md)

## 常用命令

安装依赖：

```bash
npm install
```

本地干跑：

```bash
npm start
```

强制预览调仓建议：

```bash
FORCE_TRIGGER=1 npm start
```

温度矩阵调参：

```bash
npm run strategy:grid
```

首次本地生成忽略配置：

```bash
npm run config:init
```

真实发送飞书消息：

```bash
npm run notify
```

## 本地环境变量

```bash
cp .env.example .env.local
```

当前代码真实发送群机器人时需要：

```bash
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
```

配置优先级现在是：

1. `PORTFOLIO_JSON / STRATEGY_JSON / STATE_JSON`
2. 本地忽略文件 `data/portfolio.json`、`data/strategy.json`、`state.json`
3. 示例文件提示

自动化落地步骤直接看 [自动化上线清单](./docs/04-automation.md)。
