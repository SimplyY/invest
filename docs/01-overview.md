# 项目总览

## 项目目标

这个项目的目标是把债券投资中的“温度驱动配置调整”固化成一套可以自动执行、自动提醒、可持续调参的程序。

当前系统会做 3 件事：

1. 抓取债市温度和 10 年期国债收益率
2. 根据组合配置与策略规则生成每只基金的目标金额和操作建议
3. 通过飞书发送每日打卡和区间切换提醒

## 当前能力边界

已经完成：

- 抓取逻辑
- 组合策略计算
- 温度矩阵调参命令
- 飞书群机器人 webhook 推送
- GitHub Actions 定时执行工作流

## 仓库结构

- `src/index.ts`：主入口
- `src/strategy.ts`：核心策略引擎
- `src/scenarios/temperature-grid.ts`：温度矩阵调参命令
- `src/scraper.ts`：数据抓取
- `src/report.ts`：消息文本渲染
- `src/feishu.ts`：当前 webhook 发送实现
- `data/portfolio.json`：真实组合配置
- `data/strategy.json`：真实策略配置
- `.github/workflows/investment_bot.yml`：定时任务

## 最常用命令

```bash
npm run start:dry
npm run strategy:grid
npm run start
```
