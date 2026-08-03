import { createN8nWebhookDispatch } from './n8n-webhook'

const appointmentEvent = {
  eventId: 'appointment_booked:appt_123',
  locationId: 'loc_123',
  triggerType: 'appointment_booked' as const,
  contactId: 'contact_123',
  resource: { type: 'appointment', id: 'appt_123' },
  data: {
    calendarId: 'cal_123',
    calendarName: 'Consultations',
    startsAt: '2026-08-04T16:00:00.000Z',
    endsAt: '2026-08-04T16:30:00.000Z',
  },
}

test('posts the OpenLevel appointment event to n8n with header authentication', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init })
    return new Response(JSON.stringify({ ok: true, received: 'appointment_booked' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const dispatch = createN8nWebhookDispatch({
    url: 'https://example.app.n8n.cloud/webhook/openlevel-poc',
    secret: 'test-shared-secret',
    fetchImpl: fakeFetch,
    now: () => new Date('2026-08-03T22:00:00.000Z'),
  })

  const result = await dispatch.send(appointmentEvent)

  expect(result).toEqual({ status: 200, body: { ok: true, received: 'appointment_booked' } })
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe('https://example.app.n8n.cloud/webhook/openlevel-poc')
  expect(calls[0]?.init?.method).toBe('POST')

  const headers = calls[0]?.init?.headers as Record<string, string>
  expect(headers['x-openlevel-key']).toBe('test-shared-secret')
  expect(headers['x-openlevel-event']).toBe('appointment_booked')
  expect(headers['x-openlevel-event-id']).toBe('appointment_booked:appt_123')

  const payload = JSON.parse(String(calls[0]?.init?.body))
  expect(payload).toEqual({
    source: 'openlevel',
    version: 1,
    sentAt: '2026-08-03T22:00:00.000Z',
    event: appointmentEvent,
  })
})

test('rejects a non-success n8n response without exposing the shared secret', async () => {
  const fakeFetch: typeof fetch = async () => new Response('unauthorized', { status: 401 })
  const dispatch = createN8nWebhookDispatch({
    url: 'https://example.app.n8n.cloud/webhook/openlevel-poc',
    secret: 'secret-that-must-not-leak',
    fetchImpl: fakeFetch,
  })

  try {
    await dispatch.send(appointmentEvent)
    throw new Error('expected n8n request to fail')
  } catch (error) {
    expect(String(error)).toContain('n8n webhook rejected OpenLevel event (401)')
    expect(String(error)).not.toContain('secret-that-must-not-leak')
  }
})

test('requires a webhook URL and secret before any request can be made', () => {
  expect(() => createN8nWebhookDispatch({ url: '', secret: 'x' })).toThrow('N8N_WEBHOOK_URL is required')
  expect(() => createN8nWebhookDispatch({ url: 'https://example.com', secret: '' })).toThrow(
    'N8N_WEBHOOK_SECRET is required',
  )
})
