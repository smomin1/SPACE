type EmailPayload = {
  to: string
  subject: string
  html: string
  text: string
}

const APP_NAME = 'SPACE'
const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

function parseFrom(raw: string): { email: string; name: string } {
  const match = raw.match(/^(.+?)\s*<(.+)>$/)
  if (match) return { name: match[1].trim(), email: match[2].trim() }
  return { name: APP_NAME, email: raw.trim() }
}

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:22px;letter-spacing:0.18em;color:#1a5c43;font-weight:bold;">
                SPACE
              </p>
              <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#888;">
                Software Platform Analysis, Comparison &amp; Evaluation
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:8px;border:1px solid #e5e2dc;padding:36px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
                This is an automated message from ${APP_NAME}. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const baseText = (lines: string[]) =>
  [`${APP_NAME} - Software Platform Analysis, Comparison & Evaluation`, '', ...lines, '', '---', 'This is an automated message. Please do not reply.'].join('\n')

async function sendEmail(payload: EmailPayload): Promise<void> {
  const sendgridKey = process.env.SENDGRID_API_KEY
  const fromRaw = process.env.EMAIL_FROM ?? `${APP_NAME} <noreply@space-eval.app>`
  const from = parseFrom(fromRaw)

  if (sendgridKey) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        personalizations: [{ to: [{ email: payload.to }] }],
        subject: payload.subject,
        content: [
          { type: 'text/plain', value: payload.text },
          { type: 'text/html',  value: payload.html },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SendGrid error ${res.status}: ${body}`)
    }
    return
  }

  // Console fallback when no email provider is configured
  console.log('\n------------------------------------------')
  console.log(`[EMAIL] To:      ${payload.to}`)
  console.log(`[EMAIL] Subject: ${payload.subject}`)
  console.log(`[EMAIL] Body:\n${payload.text}`)
  console.log('------------------------------------------\n')
}

export async function sendTemporaryPassword(to: string, name: string, tempPassword: string) {
  await sendEmail({
    to,
    subject: `Your SPACE account has been created`,
    html: layout(`
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:#333;">Hi ${name},</p>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:#333;">
        Your SPACE account has been created. Use the temporary password below to sign in for the first time.
      </p>
      <div style="background:#f5f5f0;border:1px solid #e5e2dc;border-radius:6px;padding:16px 24px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Temporary password</p>
        <p style="margin:0;font-family:Courier New,monospace;font-size:22px;letter-spacing:0.12em;color:#1a5c43;font-weight:bold;">${tempPassword}</p>
      </div>
      <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:14px;color:#666;">
        You will be prompted to set a permanent password immediately after signing in.
      </p>
      <table cellpadding="0" cellspacing="0"><tr><td style="background:#1a5c43;border-radius:6px;">
        <a href="${APP_URL}/login" style="display:inline-block;padding:12px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">
          Sign in to SPACE
        </a>
      </td></tr></table>
      <p style="margin:24px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#aaa;">
        If you were not expecting this email, please disregard it.
      </p>
    `),
    text: baseText([
      `Hi ${name},`,
      '',
      'Your SPACE account has been created. Use the temporary password below to sign in.',
      '',
      `Temporary password: ${tempPassword}`,
      '',
      'You will be prompted to set a permanent password immediately after signing in.',
      '',
      `Sign in here: ${APP_URL}/login`,
    ]),
  })
}

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const link = `${APP_URL}/reset-password?token=${resetToken}`
  await sendEmail({
    to,
    subject: `Reset your SPACE password`,
    html: layout(`
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:#333;">Hi ${name},</p>
      <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:15px;color:#333;">
        We received a request to reset your SPACE password. Click the button below to choose a new one.
      </p>
      <table cellpadding="0" cellspacing="0"><tr><td style="background:#1a5c43;border-radius:6px;">
        <a href="${link}" style="display:inline-block;padding:12px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">
          Reset my password
        </a>
      </td></tr></table>
      <p style="margin:24px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#666;">
        This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
      </p>
    `),
    text: baseText([
      `Hi ${name},`,
      '',
      'We received a request to reset your SPACE password.',
      '',
      `Reset your password here: ${link}`,
      '',
      'This link expires in 1 hour. If you did not request a reset, ignore this email.',
    ]),
  })
}

export async function sendAccessRequestApproved(to: string, name: string, tempPassword: string) {
  await sendEmail({
    to,
    subject: `Your SPACE access request has been approved`,
    html: layout(`
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:#333;">Hi ${name},</p>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:#333;">
        Your request for access to SPACE has been approved. Use the temporary password below to sign in.
      </p>
      <div style="background:#f5f5f0;border:1px solid #e5e2dc;border-radius:6px;padding:16px 24px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Temporary password</p>
        <p style="margin:0;font-family:Courier New,monospace;font-size:22px;letter-spacing:0.12em;color:#1a5c43;font-weight:bold;">${tempPassword}</p>
      </div>
      <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:14px;color:#666;">
        You will be prompted to set a permanent password immediately after signing in.
      </p>
      <table cellpadding="0" cellspacing="0"><tr><td style="background:#1a5c43;border-radius:6px;">
        <a href="${APP_URL}/login" style="display:inline-block;padding:12px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">
          Sign in to SPACE
        </a>
      </td></tr></table>
    `),
    text: baseText([
      `Hi ${name},`,
      '',
      'Your request for access to SPACE has been approved.',
      '',
      `Temporary password: ${tempPassword}`,
      '',
      'You will be prompted to set a permanent password immediately after signing in.',
      '',
      `Sign in here: ${APP_URL}/login`,
    ]),
  })
}

export async function sendAccessRequestRejected(to: string, name: string) {
  await sendEmail({
    to,
    subject: `Update on your SPACE access request`,
    html: layout(`
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:#333;">Hi ${name},</p>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;color:#333;">
        Thank you for your interest in SPACE. After review, we are unable to approve your access request at this time.
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;color:#333;">
        If you believe this is an error, please contact your team lead for assistance.
      </p>
    `),
    text: baseText([
      `Hi ${name},`,
      '',
      'Thank you for your interest in SPACE.',
      '',
      'After review, we are unable to approve your access request at this time.',
      '',
      'If you believe this is an error, please contact your team lead.',
    ]),
  })
}
