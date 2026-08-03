import { createBrevoEmailSender } from '../server/lib/brevo-email'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main() {
  const live = process.env.POC_BREVO_LIVE === '1'
  const recipient = required('POC_TEST_EMAIL')
  const send = createBrevoEmailSender({
    apiKey: required('BREVO_API_KEY'),
    senderEmail: required('BREVO_FROM_EMAIL'),
    senderName: process.env.BREVO_FROM_NAME?.trim() || 'OpenLevel POC',
    sandbox: !live,
  })

  const result = await send({
    to: { email: recipient, name: 'OpenLevel Test Recipient' },
    subject: live
      ? 'OpenLevel POC — real appointment email test'
      : 'OpenLevel POC — Brevo sandbox validation',
    text: live
      ? 'This is a real delivery test for the OpenLevel appointment and follow-up proof of concept.'
      : 'This request is intentionally dropped by Brevo sandbox mode. It validates the integration without delivering email.',
    tags: ['openlevel-poc', live ? 'live-delivery' : 'sandbox-validation'],
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: live ? 'live' : 'sandbox',
        recipient,
        messageId: result.messageId,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
