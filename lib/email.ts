type EmailPayload = {
  to: string
  subject: string
  html: string
}

const APP_NAME = 'SPACE'
const FROM = process.env.EMAIL_FROM ?? `${APP_NAME} <noreply@space-eval.app>`
const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

async function sendEmail(payload: EmailPayload): Promise<void> {
  const sendgridKey = process.env.SENDGRID_API_KEY

  if (sendgridKey) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: FROM.match(/<(.+)>/)?.[1] ?? FROM, name: APP_NAME },
        personalizations: [{ to: [{ email: payload.to }] }],
        subject: payload.subject,
        content: [{ type: 'text/html', value: payload.html }],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SendGrid error ${res.status}: ${body}`)
    }
    return
  }

  // Console fallback when no email provider is configured
  console.log('\n──────────────────────────────────────────')
  console.log(`[EMAIL] To:      ${payload.to}`)
  console.log(`[EMAIL] Subject: ${payload.subject}`)
  console.log(`[EMAIL] Body:\n${payload.html.replace(/<[^>]+>/g, '')}`)
  console.log('──────────────────────────────────────────\n')
}

export async function sendTemporaryPassword(to: string, name: string, tempPassword: string) {
  await sendEmail({
    to,
    subject: `Your ${APP_NAME} account — temporary password`,
    html: `
      <p>Hi ${name},</p>
      <p>Your ${APP_NAME} account has been created. Use the temporary password below to sign in.</p>
      <p style="font-size:20px;font-family:monospace;letter-spacing:0.1em;background:#f4f4f4;padding:12px 20px;border-radius:6px;display:inline-block">
        ${tempPassword}
      </p>
      <p>You will be asked to set a new password immediately after signing in.</p>
      <p><a href="${APP_URL}/login">Sign in to ${APP_NAME}</a></p>
      <p style="color:#888;font-size:12px">If you did not expect this email, please ignore it.</p>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const link = `${APP_URL}/reset-password?token=${resetToken}`
  await sendEmail({
    to,
    subject: `${APP_NAME} — reset your password`,
    html: `
      <p>Hi ${name},</p>
      <p>We received a request to reset your ${APP_NAME} password. Click the link below to set a new one.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#1a5c43;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p>
      <p style="color:#888;font-size:12px">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
    `,
  })
}

export async function sendAccessRequestApproved(to: string, name: string, tempPassword: string) {
  await sendEmail({
    to,
    subject: `Your ${APP_NAME} access request has been approved`,
    html: `
      <p>Hi ${name},</p>
      <p>Your request for access to ${APP_NAME} has been approved. Use the temporary password below to sign in.</p>
      <p style="font-size:20px;font-family:monospace;letter-spacing:0.1em;background:#f4f4f4;padding:12px 20px;border-radius:6px;display:inline-block">
        ${tempPassword}
      </p>
      <p>You will be asked to set a new password immediately after signing in.</p>
      <p><a href="${APP_URL}/login">Sign in to ${APP_NAME}</a></p>
    `,
  })
}

export async function sendAccessRequestRejected(to: string, name: string) {
  await sendEmail({
    to,
    subject: `${APP_NAME} — access request update`,
    html: `
      <p>Hi ${name},</p>
      <p>After review, your request for access to ${APP_NAME} was not approved at this time.</p>
      <p>If you believe this is an error, please contact your team lead.</p>
    `,
  })
}
