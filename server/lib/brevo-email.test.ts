import { createBrevoEmailSender } from './brevo-email'

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('sends one sandbox transactional email and returns the provider message id', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init })
    return jsonResponse({ messageId: '<poc-message@brevo>' })
  }

  const send = createBrevoEmailSender({
    apiKey: 'test-api-key',
    senderEmail: 'bookings@example.com',
    senderName: 'Test Business',
    sandbox: true,
    fetchImpl: fakeFetch,
  })

  const result = await send({
    to: { email: 'customer@example.com', name: 'Customer One' },
    subject: 'Your appointment is confirmed',
    text: 'Your consultation is booked.',
    tags: ['openlevel-poc', 'appointment-confirmation'],
  })

  expect(result.messageId).toBe('<poc-message@brevo>')
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe('https://api.brevo.com/v3/smtp/email')
  expect(calls[0]?.init?.method).toBe('POST')

  const headers = calls[0]?.init?.headers as Record<string, string>
  expect(headers['api-key']).toBe('test-api-key')
  const payload = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>
  expect(payload).toMatchObject({
    sender: { email: 'bookings@example.com', name: 'Test Business' },
    to: [{ email: 'customer@example.com', name: 'Customer One' }],
    subject: 'Your appointment is confirmed',
    textContent: 'Your consultation is booked.',
    tags: ['openlevel-poc', 'appointment-confirmation'],
    headers: { 'X-Sib-Sandbox': 'drop' },
  })
  expect(payload).not.toHaveProperty('htmlContent')
})

test('uses html instead of text because Brevo accepts only one body type', async () => {
  let payload: Record<string, unknown> | undefined
  const fakeFetch: typeof fetch = async (_input, init) => {
    payload = JSON.parse(String(init?.body)) as Record<string, unknown>
    return jsonResponse({ messageId: 'msg-html' })
  }
  const send = createBrevoEmailSender({
    apiKey: 'key',
    senderEmail: 'sender@example.com',
    fetchImpl: fakeFetch,
  })

  await send({
    to: { email: 'recipient@example.com' },
    subject: 'HTML test',
    text: 'plain fallback',
    html: '<p>HTML body</p>',
  })

  expect(payload?.htmlContent).toBe('<p>HTML body</p>')
  expect(payload).not.toHaveProperty('textContent')
  expect(payload).not.toHaveProperty('headers')
})

test('throws a safe error when Brevo rejects the request', async () => {
  const fakeFetch: typeof fetch = async () => jsonResponse({ message: 'invalid sender' }, 400)
  const send = createBrevoEmailSender({
    apiKey: 'secret-that-must-not-leak',
    senderEmail: 'sender@example.com',
    fetchImpl: fakeFetch,
  })

  await expect(
    send({
      to: { email: 'recipient@example.com' },
      subject: 'Failure test',
      text: 'body',
    }),
  ).rejects.toThrow('Brevo email request failed (400)')

  try {
    await send({
      to: { email: 'recipient@example.com' },
      subject: 'Failure test',
      text: 'body',
    })
  } catch (error) {
    expect(String(error)).not.toContain('secret-that-must-not-leak')
  }
})

test('rejects incomplete messages before making a provider request', async () => {
  let called = false
  const fakeFetch: typeof fetch = async () => {
    called = true
    return jsonResponse({ messageId: 'never' })
  }
  const send = createBrevoEmailSender({
    apiKey: 'key',
    senderEmail: 'sender@example.com',
    fetchImpl: fakeFetch,
  })

  await expect(
    send({ to: { email: 'recipient@example.com' }, subject: 'Missing body' }),
  ).rejects.toThrow('requires a text or html body')
  expect(called).toBe(false)
})
