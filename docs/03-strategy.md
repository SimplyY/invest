# 策略与配置

## 组合配置文件

真实组合默认落在本地忽略文件 [data/portfolio.json](/Users/yuwei/Documents/code/invest/data/portfolio.json:1)。

关键字段：

- `role`：资产角色，`buffer / active / offensive`
- `baseWeight`：默认基础权重
- `durationYears`：久期年限
- `riskBucket`：`low / medium / high`
- `minValue / maxValue`：边界保护
- `temperatureTargetWeights`：按温度配置目标权重锚点

## 策略配置文件

真实策略默认落在本地忽略文件 [data/strategy.json](/Users/yuwei/Documents/code/invest/data/strategy.json:1)。

关键结构：

- `bands`：温度区间与基础信号
- `formula`：全局参数

关键参数包括：

- `targetTotalValue`
- `signalScale`
- `durationScaleYears`
- `riskMultipliers`
- `lowEntropyRange`
- `hotZone`
- `coldLiquidityReserve`
- `activePriorityBoost`

## 当前调参方式

优先顺序建议：

1. 先用 `npm run strategy:grid` 看整张温度矩阵
2. 如果是整体斜率不对，调 `data/strategy.json`
3. 如果是个别基金不符合直觉，调对应基金的 `temperatureTargetWeights`

## 温度矩阵命令

```bash
npm run strategy:grid
```

可选自定义温度点：

```bash
TEMPERATURE_GRID=0,5,10,20,30,40,50,60,70,80,90,100 npm run strategy:grid
```

输出包含：

- 区间摘要
- 各基金操作后金额矩阵
- 各基金操作金额矩阵
- 三个池子的汇总矩阵
