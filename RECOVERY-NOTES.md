# 海拓 1.1.22 恢复工程

## 版本

应用修复基于 ananan28/haituo-macos-clean 的提交 74760ae785b01d0ed0665f3e84cc89027881afcd。
Windows 打包分支：release/windows-1.1.22。Windows x64 安装程序使用 Electron 44.1.0。

## 包含内容

- 原始上传归档及 SHA-256 校验清单。
- 解包后的应用 JavaScript、HTML、CSS、图片、语言资源和已有依赖。
- 1.1.22 的全部修复脚本和验证脚本。
- 应用修复后的运行代码位于 recovered-app/。
- Windows 原生依赖准备脚本和 GitHub Actions 安装包构建工作流。
- 原有 macOS 构建脚本和工作流。

## 完整性限制

这是可继续修改运行代码、并重建安装包的恢复工程，不是完整原始开发源码。
归档没有当前应用原始 TypeScript/TSX、应用 source maps、开发依赖锁文件或完整后端工程。
node_modules 中个别第三方模块包含 TypeScript，不代表海拓自身的开发源码完整。
未将不同架构的旧项目源码混入当前版本，也未加入账号数据、聊天记录或用户 API 密钥。
原生第三方模块在构建时按固定版本和校验值下载；本包不包含所有平台的原生依赖源码。

## Windows 重建

最直接的方法是推送至已配置分支，运行 .github/workflows/build-windows-release.yml。
Windows 本机构建需要 Python 3.12、Node.js 24 以及网络连接：

1. 在工程根目录设置 PYTHONUTF8=1。
2. 运行 python windows/prepare.py。
3. 按工作流安装固定版本打包工具与 RingRTC 的 tar 依赖。
4. 执行工作流中的 JavaScript 检查和 electron-builder 命令。
5. 安装程序在 windows/out/，并执行工作流的原生模块加载检查。

## 验证范围

macOS 的用户功能验收由用户报告通过；不能据此推断 Windows 已通过真实账号收发、
多账号窗口、语音和翻译测试。Windows 构建记录应作为独立的构建与依赖验证证据。
