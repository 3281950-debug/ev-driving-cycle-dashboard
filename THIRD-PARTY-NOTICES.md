# 来源与第三方许可

基础项目：[TheBorba/obd-react-panel](https://github.com/TheBorba/obd-react-panel)。保留根目录 LICENSE 中的原 MIT 许可和版权声明，不替换作者归属。

主要依赖：React / React DOM（MIT）、Lucide React（ISC）、canvas-gauges（MIT）、Tailwind CSS（MIT）。其他构建/测试依赖采用 Apache-2.0、BSD、ISC、MIT、MPL-2.0 等许可。精确索引见 licenses/DEPENDENCIES.json，许可文本保存在 licenses/。

仓库没有提交依赖实现代码、node_modules、编译工具二进制或 Node.js 运行时；依赖通过锁文件从原发布渠道安装。本项目没有修改这些依赖源码。MPL-2.0 条目对应 lightningcss 构建依赖，保留其完整许可文本。

packaging/build-portable.ps1 在用户自行打包时下载官方 Node.js，并将完整 LICENSE 与 node.exe 一起放入输出目录；这些二进制文件不进入源码仓库。重新分发运行包应保留相关许可和版权声明。

界面使用项目代码绘制 Canvas / SVG 和 Lucide 图标，文档图片为项目实际运行截图。没有随仓库提供官方工况数据库、实车标定文件、商业模型或车辆厂商素材包。
