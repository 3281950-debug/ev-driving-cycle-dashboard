# 项目架构

## 技术栈与边界

锁定版本：React / React DOM 19.2.8、TypeScript 5.9.3、Vite 8.3.3、Tailwind Vite 插件 4.3.3、Lucide React 0.469.0、canvas-gauges 2.1.7。测试采用 Vitest 4.1.11、Testing Library 与 happy-dom；检查采用 ESLint。精确依赖以 `package-lock.json` 为准。

没有业务后端、数据库、远程计算接口、Electron 或 Tauri。浏览器执行全部新能源汽车计算。`Portable/launcher/server.mjs` 只用 Node 内置模块提供静态文件、健康检查和受令牌保护的停止入口，不计算车辆状态，也不保存分析结果。

## 关键模块

| 位置（相对仓库根目录） | 职责 |
| --- | --- |
| `index.html`、`src/main.tsx` | 中文页面入口与 React 挂载 |
| `src/App.tsx` | 导航、面板选择及顶层数据控制器 |
| `src/panels/registry.ts` | 新能源工程、经典 OBD、BYD King 面板注册 |
| `src/hooks/useEVSimulator.ts` | 播放状态、倍速、异步完成/定位、重置与 UI 发布 |
| `src/simulation/simulationEngine.ts` | 纯函数 `computeEVStep`、初始状态及短时曲线缓存 |
| `src/simulation/timeline.ts` | 0.05 s 固定步长计算、完整状态缓存、精确回看与结果摘要 |
| `src/simulation/vehicleConfig.ts` | 车辆与简化模型参数 |
| `src/drivingCycles/index.ts` | 六条近似轨迹、样本验证及目标速度插值 |
| `src/components/EV/` | 控制、仪表数据、能量流、曲线与完成摘要 |
| `src/utils/evPresentation.ts` | 从真实状态推导显示标签，不改物理计算 |
| `src/analysis/comparison.ts` | 独立多工况计算、指标汇总、规则总结及 TSV/CSV 序列化 |
| `src/hooks/useCycleComparison.ts` | 结果映射、多选、进度、任务取消与重复分析管理 |
| `src/components/Analysis/` | 统计图、表格、筛选和总结呈现 |
| `src/hooks/useDashboardData.ts` | 保留的 OBD 模拟/蓝牙数据控制 |
| `src/hooks/useBluetoothOBD.ts` | 可选 Web Bluetooth OBD 通信，非 EV 仿真必需 |
| `src/localization/zhCN.ts` | 简体中文文案与工况说明 |

## 数据流

```text
工况样本 + 车辆参数 + 初始 EVState
  → SimulationTimeline.calculateNext()
  → computeEVStep(..., 0.05)
  → 精确状态缓存 + 0.2 s 图表采样
  → useEVSimulator 发布快照
  → 仪表、电池、电机、能量流、时间轴和 Canvas 图表

工况分析操作
  → useCycleComparison
  → 各工况分别 initialEVState() + SimulationTimeline
  → AnalysisResult
  → 同一份筛选结果用于概览、三张图、表格、导出和规则总结
```

实时控制器每 50 ms 更新一次界面，倍速增加固定物理步的数量，不放大物理步长。一键完成和向未来定位分为约 8 ms 计算片段并让出事件循环，避免播放全部中间动画。曲线正常播放保留约 60 s / 最多 301 点；回看和完成时使用时间轴完整采样。

两个视图的控制器位于 `App`，切换不会重置实时仿真或清空分析结果；进入分析页后实时仿真继续运行。浏览器页面隐藏时，播放循环不推进。工况切换会重新计时，保留当前电池与累计行程状态；“重置”恢复默认 CLTC 和初始状态。

## 存储与通信

- 仿真状态及分析结果在内存中；刷新页面清空。
- `src/utils/themeStorage.ts` 存在 localStorage 主题偏好读写工具，不是业务数据库。
- CSV 由 Blob 下载，TSV 通过剪贴板或手动文本框复制；没有数据上传或 UI 导入入口。
- 静态服务只绑定 `127.0.0.1`，使用系统分配的空闲端口。
- 启动器根据便携目录生成实例标识，以互斥锁防止同时重复启动；验证进程路径和健康信息后复用。
- 停止请求带本次服务令牌；不会按进程名称批量结束其他 Node 服务。
- 日志和状态位于当前用户 LocalAppData；令牌仅在运行时生成，不包含在交付文件中。

## 来源与交付差异

原项目为 TheBorba/obd-react-panel，保留 MIT LICENSE 和 `docs/upstream-readme.md`。`src`、工况及模型文件未做交付改写。发布采用新的干净 Git 历史，不含旧 Git 工作历史、开发者运行缓存、旧本机启动脚本和含个人路径的阶段报告；这些都留在原工程。新的 `packaging/` 是独立、无 npm 运行依赖的启动层。
