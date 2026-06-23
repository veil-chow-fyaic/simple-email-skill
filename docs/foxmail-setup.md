# Foxmail / QQ 邮箱授权码获取

Foxmail 邮箱(`@foxmail.com`)本质是腾讯 QQ 邮箱,IMAP/SMTP 走 `imap.qq.com` / `smtp.qq.com`,登录用**授权码**而非 QQ 密码或邮箱独立密码。

> 官方说明:[QQ 邮箱授权码](https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode)

## 为什么用授权码

授权码是专为第三方客户端(IMAP/SMTP)生成的独立密码:

- 不暴露你的真实登录密码
- 可随时吊销,不影响网页/手机端登录
- 各服务商(QQ/163/Gmail)都是这个机制

## 获取授权码(QQ / Foxmail)

1. 浏览器登录邮箱:`https://wx.mail.qq.com`(用你的 Foxmail 账号或绑定的 QQ 登录)
2. 顶部点 **设置** ⚙️
3. 进入 **账号** → **账号与安全**(左侧导航)
4. 找到 **「POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV 服务」** 区域
5. 确认服务为 **「已开启」**(若未开启,点开启,按提示用绑定的手机发短信验证)
6. 点 **「生成授权码」**,完成短信验证后会生成一个 **16 位授权码**(全小写字母,形如 `abcdefghijklmnop`)
7. 把这串授权码填入 `.env` 的 `EMAIL_PASS`

> ⚠️ 授权码只显示一次,请保存好。忘了或丢失就重新生成(旧的会自动失效)。一个账号可生成多个授权码,互不影响。

## 填写 .env(凭据放在这里)

仓库**根目录**的 `.env` 文件(不存在就从模板复制):

```bash
cp .env.example .env
```

编辑 `.env`,填入两行关键信息即可(Foxmail 会自动识别为 QQ 服务器,无需手动填 host):

```ini
# 你的邮箱地址(完整)
EMAIL_USER=feng.463728559@foxmail.com

# 刚生成的 16 位授权码(不是登录密码!)
EMAIL_PASS=你的授权码

# 下面这些留空即可,会自动识别:
EMAIL_PRESET=
EMAIL_MAILBOX=INBOX
```

> 🔒 `.env` 已在 `.gitignore` 中,不会被提交到 git。**请勿把授权码提交到仓库或分享给他人。** 模板见 `.env.example`。

## 验证配置

填好 `.env` 后,在仓库根目录跑自检:

```bash
node scripts/doctor.js
```

期望三项全 `ok`:

```json
{
  "ok": true,
  "pass": 3,
  "total": 3,
  "steps": [
    { "name": "配置加载", "status": "ok" },
    { "name": "IMAP 连接", "status": "ok" },
    { "name": "SMTP 连接", "status": "ok" }
  ]
}
```

### 排错

| 现象 | 原因 / 解决 |
|---|---|
| IMAP 认证失败 | 99% 是授权码填错、或服务没开启。回网页版重新确认 |
| Socket timeout | 网络慢。调大 `EMAIL_TIMEOUT`(默认 30000ms),或减小 `--limit` |
| 邮件列表为空 | 检查 `EMAIL_MAILBOX` 是否正确(INBOX / Junk / Sent Messages 等) |

## 已验证的事实(QQ / Foxmail 特性)

本项目已在 `feng.463728559@foxmail.com` 真实账号上端到端验证:

- ✅ IMAP 收信(imap.qq.com:993)—— list / read / search / mailbox 全部正常
- ✅ SMTP 发信(smtp.qq.com:465)—— `send` 返回 `250 OK: queued as`
- ⚠️ **经 SMTP 客户端发出的邮件,默认不会出现在网页版「已发送」信箱里**。这是 QQ/Foxmail 的正常行为(与网页端发送不同),不代表发信失败。只要返回 `250 OK` 即表示服务器已接收并投递。

## 其他服务商速查

### 163 / 126
- 网页登录 → 设置 → POP3/SMTP/IMAP → 开启 IMAP/SMTP
- 设置「客户端授权密码」(不是登录密码)
- 填入 `EMAIL_PASS`

### Gmail
- 先开启两步验证:https://myaccount.google.com/security
- 再生成应用专用密码:https://myaccount.google.com/apppasswords
- 16 位密码填入 `EMAIL_PASS`
- ⚠️ 国内需代理才能连 `imap.gmail.com`

### Outlook / Hotmail / Live
- 一般直接用账号密码即可(SMTP 端口 587)
- 若开了两步验证,需应用专用密码

## 服务商 → 配置对应表

| 邮箱 | 后缀 | IMAP | SMTP | 凭据 |
|---|---|---|---|---|
| Foxmail / QQ | @foxmail.com @qq.com | imap.qq.com:993 | smtp.qq.com:465 | 授权码 |
| 网易 163/126 | @163.com @126.com | imap.163.com:993 | smtp.163.com:465 | 客户端授权密码 |
| Gmail | @gmail.com | imap.gmail.com:993 | smtp.gmail.com:465 | 应用专用密码 |
| Outlook | @outlook/@hotmail/@live | outlook.office365.com:993 | smtp.office365.com:587 | 账号密码 |
| 新浪 | @sina.com | imap.sina.com:993 | smtp.sina.com:465 | 授权码 |
| 其他 | — | 自定义 | 自定义 | `EMAIL_PRESET=custom` + `IMAP_HOST/SMTP_HOST` |
