// 事务邮件发送层。直接打 Resend 的 HTTP API —— 不引 SDK，`fetch` 就够了，
// 少一个依赖。
//
// RESEND_API_KEY / MAIL_FROM 任一未配置 → 每次发送都是一个不做事的空操作，
// 本地开发和任何没配 key 的部署行为跟接入前完全一致（同 Sentry / push 的处理）。
//
// 发信域名用的是子域名 mail.blakard.com，这是刻意的：blakard.com 的 SPF 由
// GoDaddy 的 SPF 服务托管、MX 指向 Google Workspace，发信记录全部放在子域名上，
// 这两样一个字都不用动；万一投递信誉出问题，烧掉的也是子域名，不会连累团队
// 日常收发信的那个域名。

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;

export interface MailMessage {
  to:       string | string[];
  subject:  string;
  text:     string;
  /** 收件人点「回复」时回到哪里。用户反馈通知会设成提交者的邮箱。 */
  replyTo?: string;
}

export type MailResult =
  | { ok: true;  id: string }
  | { ok: false; reason: 'not_configured' | 'http_error' | 'network_error'; detail?: string };

export function mailerConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;
}

/**
 * 尽力而为地发一封信。**永不抛异常** —— 调用方都是通知路径，一封信发失败
 * 不该让用户的请求跟着失败。结果交给调用方记日志。
 */
export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.MAIL_FROM;
  if (!apiKey || !from) return { ok: false, reason: 'not_configured' };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to:      Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        text:    msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // Resend 的报错体很短，整个带上便于排查（401 = key 不对，403 = 域名没验证）
      return { ok: false, reason: 'http_error', detail: `${res.status} ${await res.text()}`.slice(0, 500) };
    }

    const body = (await res.json()) as { id?: string };
    return { ok: true, id: body.id ?? '(no id)' };
  } catch (err) {
    return { ok: false, reason: 'network_error', detail: err instanceof Error ? err.message : String(err) };
  }
}
