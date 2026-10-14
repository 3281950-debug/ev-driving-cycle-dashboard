# 构建与重新打包

## 开发环境

源码的 Vite 要求 Node `^20.19.0 || >=22.12.0`。建议使用带 npm 的 Node 22.23.3；本交付副本使用该版本执行工程检查与构建。Windows 10/11 x64 是运行包目标；重新打包脚本使用 Windows PowerShell 5.1 或 PowerShell 7。

`package-lock.json` 锁定依赖；不要以升级包代替复现。源码前端仍保留原 `package.json` 版本 `0.0.0`，发布版本以 Git 提交为准。

## 安装、运行与检查

进入仓库根目录：

```powershell
npm ci
npm run dev -- --host 127.0.0.1
```

验证命令：

```powershell
npm run typecheck
npm run lint
npm run test:run
node --test packaging/server.test.mjs
npm run build
npm run preview -- --host 127.0.0.1
```

开发和预览地址以实际输出为准。`dist` 是可重建产物，不包含在干净源码副本中；交付的生产资源位于 `Portable/web`。不要直接双击 `dist/index.html`，其中资源采用根路径 `/assets/`，应通过 HTTP 服务访问。

## 重新生成便携目录

完成 build 后，在仓库根目录 执行（输出路径请选择一个不存在的新目录）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\build-portable.ps1 -OutputDirectory ..\Portable-Rebuilt
```

脚本下载官方 `node-v22.23.3-win-x64.zip`，验证固定 SHA256：

```text
2b0ff57b049cda1bbcea2240eec20467018713c1efe1f7360c2681859b90ed71
```

来源：`https://nodejs.org/dist/v22.23.3/`，校验清单 `SHASUMS256.txt`。校验是下载完整性核对，并非额外的 GPG 签名认证。

脚本从官方包提取 `node.exe` 与完整 LICENSE，复制 `dist` 至 `web`，生成启动/关闭入口，复制无 npm 依赖的静态服务。不会覆盖已有输出，也不会修改前端源码。临时下载目录会在终端中显示；确认输出后可自行清理。

打包阶段需要互联网下载 Node；运行生成的 Portable 不需要联网。重新制作完整交付 ZIP 时，应附带源码、本文档、项目 LICENSE、依赖许可说明和本次重新测试记录，并更新版本及校验清单。不要把 node_modules、Git、日志、缓存或旧开发启动器放入发布包。

## 启动层原理

- `entry.vbs`：启动/关闭脚本的共同内容，按入口文件名选择操作，隐藏 PowerShell 窗口。
- `launch.ps1`：只使用相对目录及随包 Node；创建每目录互斥锁，检查已有实例，等待页面就绪，再打开浏览器；错误弹窗和日志均保留。
- `server.mjs`：绑定回环地址、系统自动分配端口；服务生产文件，不启动 Vite，不引入开发依赖；关闭需要运行时令牌。
- 备用 cmd 直接调用相同 PowerShell 脚本，便于被禁用 VBS 的环境使用。

## 常见故障

| 现象 | 处理 |
| --- | --- |
| 随包 node.exe / web 缺失 | 完整解压；检查安全软件是否隔离文件，按单位政策处理 |
| 启动脚本被阻止 | 使用备用 cmd；若 PowerShell 同样被政策禁止，请管理员批准，不强行绕过 |
| 无法写日志 | 检查当前用户 LocalAppData 权限及剩余空间 |
| 网页打不开 | 从日志获取实际地址；不要使用旧的 5173 书签；检查本机回环访问限制 |
| 关闭浏览器后仍有 Node | 使用“关闭仪表盘”入口；它只停止已校验的本目录实例 |
| CSV 自动下载被阻止 | 检查浏览器下载策略；可复制 TSV 或使用手动复制框 |
| 刷新后结果消失 | 当前设计使用内存状态，先导出需要保留的结果 |
| npm ci 失败 | 检查 Node 版本及网络/代理；不要删除锁文件来掩盖问题 |

未执行不同 Windows 系统的全覆盖认证；目标机实际验收结果应单独记录。
