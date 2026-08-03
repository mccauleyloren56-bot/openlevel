export interface EmailRecipient {
  email: string
  name?: string
}

export interface TransactionalEmail {
  to: EmailRecipient
  subject: string
  /** Plain-text message body. Used when html is not supplied. */
  text?: string
  /** HTML message body. When supplied, it is sent instead of text. */
  html?: string
  /** Provider-side labels used to trace POC messages and delivery events. */
  tags?: string[]
}

export interface EmailSendResult {
  /** Provider message identifier returned after the request is accepted. */
  messageId: string
}

/**
 * Provider-neutral transactional email rail. Workflow code depends on this
 * contract, not on Brevo directly, so tests can inject a deterministic fake and
 * a future customer can use another provider without rewriting the CRM.
 */
export type SendEmailFn = (message: TransactionalEmail) => Promise<EmailSendResult>
