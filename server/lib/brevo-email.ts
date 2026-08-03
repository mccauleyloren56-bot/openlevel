import type { SendEmailFn, TransactionalEmail } from './email-sender'

const BREVO_TRANSACTIONAL_URL = 'https://api.brevo.com/v3/smtp/email'

export interface BrevoEmailOptions {
  apiKey: string
  senderEmail: string
  senderName?: string
  /**
   * Brevo sandbox mode validates the request and returns a message id without
   * delivering the email. Keep true for CI and the first integration check.
   */
  sandbox?: boolean
  /** Injectable for deterministic tests. Defaults to Node's global fetch. */
  fetchImpl?: typeof fetch
}

interface BrevoResponse {
  messageId?: string
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function brevoPayload(
  options: BrevoEmailOptions,
  message: TransactionalEmail,
): Record<string, unknown> {
  const html = clean(message.html)
  const text = clean(message.text)
  if (!html && !text) throw new Error('transactional email requires a text or html body')

  const payload: Record<string, unknown> = {
    sender: {
      email: options.senderEmail.trim(),
      ...(clean(options.senderName) ? { name: clean(options.senderName) } : {}),
    },
    to: [
      {
        email: message.to.email.trim(),
        ...(clean(message.to.name) ? { name: clean(message.to.name) } : {}),
      },
    ],
    subject: message.subject.trim(),
    ...(html ? { htmlContent: html } : { textContent: text }),
    ...(message.tags?.length ? { tags: message.tags } : {}),
  }

  if (options.sandbox) {
    payload.headers = { 'X-Sib-Sandbox': 'drop' }
  }
  return payload
}

/**
 * Create a provider-neutral sender backed by Brevo's transactional email API.
 * The API key is supplied at runtime and is never stored in source control.
 */
export function createBrevoEmailSender(options: BrevoEmailOptions): SendEmailFn {
  const apiKey = options.apiKey.trim()
  const senderEmail = options.senderEmail.trim()
  if (!apiKey) throw new Error('BREVO_API_KEY is required')
  if (!senderEmail) throw new Error('BREVO_FROM_EMAIL is required')

  const fetchImpl = options.fetchImpl ?? fetch

  return async (message) => {
    if (!message.to.email.trim()) throw new Error('recipient email is required')
    if (!message.subject.trim()) throw new Error('email subject is required')

    const response = await fetchImpl(BREVO_TRANSACTIONAL_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(brevoPayload(options, message)),
    })

    const raw = await response.text()
    let parsed: BrevoResponse = {}
    try {
      parsed = raw ? (JSON.parse(raw) as BrevoResponse) : {}
    } catch {
      // Preserve the provider response below without ever echoing the API key.
    }

    if (!response.ok) {
      const detail = raw.slice(0, 500) || response.statusText || 'unknown provider error'
      throw new Error(`Brevo email request failed (${response.status}): ${detail}`)
    }

    const messageId = clean(parsed.messageId)
    if (!messageId) throw new Error('Brevo accepted the request without returning a messageId')
    return { messageId }
  }
}
