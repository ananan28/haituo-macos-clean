# 海拓独立开发工程

本工程同时构建 Windows x64 1.2.1 和 macOS ARM64 1.2.1。所有应用代码、资源、随附 JavaScript 依赖和构建脚本都在本目录内。移动整个目录，或提交到你自己的新仓库即可继续开发，不需要以前的仓库、电脑、source.zip 分卷或已安装的海拓。

## 新电脑构建

安装 Node.js 22（包含 npm）、Python 3.12。Mac 需要 Apple Silicon 和 Xcode Command Line Tools（`xcode-select --install`）。Windows 使用 x64 Windows 10/11。

Windows，在项目目录 PowerShell 执行：

```powershell
python scripts/build.py --target windows --test
```

Mac，在项目目录终端执行：

```sh
python3 scripts/build.py --target macos --test
```

首次构建需要联网下载固定版本的 Electron、打包工具及原生依赖。Windows 输出 `windows/out/Haituo-1.2.1-Windows-x64-Setup.exe`；Mac 输出 `macos/out/海拓-1.2.1-arm64.dmg`。构建不发布任何版本。Mac 使用本地临时签名；本工程不包含开发者证书或 Apple 公证凭据。

## 修改代码

`src/app` 是唯一的应用代码来源。修改这里的 JavaScript、HTML、CSS 和资源后重新执行构建命令；脚本将其复制到临时 staging 并应用 Windows 平台兼容处理，不会覆盖你的源文件。`project.json` 定义版本和工具版本；Signal 协议版本需保持兼容，不要直接替换为海拓产品版本。

应用主进程：`src/app/bundles/main.js`；主窗口预加载：`src/app/bundles/preload/main.js`；聊天网页注入与翻译：`src/app/js/caisheng-webview-preload.js`。这些是当前版本可编辑、可执行的 JavaScript，部分来自打包产物，因此变量名和格式不如原始 TypeScript 工程清晰。原作者的 TS/TSX、原始源码映射和私有服务端源码没有恢复；本工程不声称包含这些不存在的文件。

## 项目迁移

将整个目录复制到新电脑，或在此目录执行 git init 并推送到任意你有权限的新仓库。`.github/workflows/build.yml` 可在新 GitHub 仓库手动触发 Windows、Mac 构建，不包含旧仓库地址或下载旧工程步骤。不要把个人 API 密钥、用户数据、证书加入仓库。

## 服务与数据

安装包与工程不包含个人聊天数据库、登录会话或 API 密钥。旧电脑数据迁移需单独备份用户数据目录。现有账户登录、翻译控制/网关还依赖既有 Supabase 远端服务；本工程包含调用端，不包含其服务端实现，详见 `EXTERNAL-SERVICES.md`。第三方 WhatsApp/Signal 网页与平台也需要正常网络。

`--test` 包含实际启动及窗口回归验证；它使用临时数据目录，不登录你的账号。需要人工完成真实账号的收发消息、API 认证、语音转文/翻译、音频外放和数据库升级验证。

## 1.2.1 验证边界

默认保持禁止直接发送中文。关闭后，原生发送、快速输入 Enter 和顶部直接发送使用原文；手动翻译按钮仍执行翻译。回归包含真实开关保存、快速切换、草稿保留、原生回车事件、重复回车和异步输入变化。

子账号目前仍采用独立进程与独立原生窗口跟随主窗口，尚未完成同一窗口内部嵌入；拖动分离问题不能据此认定已经解决。真实账号发送、音频外放、旧数据库升级仍需实机验证。
