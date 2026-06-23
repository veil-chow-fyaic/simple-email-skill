# Foxmail / QQ 邮箱授权码获取

Foxmail 邮箱(`@foxmail.com`)本质是腾讯 QQ 邮箱,IMAP/SMTP 走 `imap.qq.com` / `smtp.qq.com`,登录用**授权码**而非 QQ 密码或邮箱独立密码。

## 为什么用授权码

授权码是专为第三方客户端(IMAP/SMTP)生成的独立密码:
- 不暴露你的真实登录密码
- 可随时吊销,不影响网页/手机端登录
- 各服务商(QQ/163/Gmail)都是这个机制

## 获取步骤(Foxmail / QQ)

1. 网页登录邮箱:`https://mail.qq.com`(用你的 Foxmail 账号或绑定的 QQ 登录)
2. 进入 **设置** → **账户**(顶部菜单)
3. 找到 **「POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV 服务」** 区域
4. 找到 **IMAP/SMTP 服务**,点 **开启**(可能需要短信验证)
5. 开启后会生成一个 **16 位授权码**(形如 `abcdefghijklmnop`)
6. 把授权码填入 `.env` 的 `EMAIL_PASS`

> ⚠️ 授权码只显示一次,请保存好。忘了就重新生成(旧的会失效)。

## 验证

```bash
# 在仓库根目录,确保已填好 .env
node scripts/doctor.js
```

期望输出三项全 `ok`:

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

若 IMAP 失败提示「认证失败」,99% 是授权码填错或服务没开启。

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
- 一般直接用账号密码即可(端口 587)
- 若开了两步验证,需应用专用密码

## .env 最终长这样(Foxmail 示例)

```ini
EMAIL_USER=feng.463728559@foxmail.com
EMAIL_PASS=你的16位授权码
# 以下留空,自动识别为 foxmail → 走 imap/smtp.qq.com
EMAIL_PRESET=
EMAIL_MAILBOX=INBOX
```

配置完即可:`node scripts/imap.js list --unread`
