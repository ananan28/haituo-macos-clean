# 外部服务依赖

本目录足以独立修改并构建桌面应用。运行部分联网功能需要外部服务：

- Signal 服务及 WhatsApp 网页：由第三方运营，需联网和账号。
- OpenAI/Groq/自定义 AI 接口：地址、模型、API 密钥来自使用者设置，未附带个人密钥。
- Supabase 的 haituo-translation-control、haituo-translation-gateway、username-login：当前客户端调用既有远程端点。远端函数源码、数据库结构、管理权限和服务端密钥不在可恢复文件内。

因此，换仓库/电脑可以继续开发和构建；如果未来同时更换或停用远端后台，则还需要取得对应后台工程或另行实现。当前工程保留原有认证与服务调用，未添加密码系统、未替换远端后台。

依赖包的许可文件位于 src/app/node_modules 中；应用随附许可与第三方声明在 src/app 内。原生包构建时依据已随附的 package.json 版本下载，校验 npm 发布校验和；RingRTC 验证其固定 SHA256。
