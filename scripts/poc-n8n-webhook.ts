import { createN8nWebhookDispatch } from '../server/lib/n8n-webhook'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main() {
  const eventId = `appointment_booked:poc-${Date.now()}`
  const dispatch = createN8nWebhookDispatch({
    url: required('N8N_WEBHOOK_URL'),
    secret: required('N8N_WEBHOOK_SECRET'),
  })

  const result = await dispatch.send({
    eventId,
    locationId: 'openlevel-poc',
    triggerType: 'appointment_booked',
    contactId: 'contact-poc',
    resource: { type: 'appointment', id: eventId.split(':')[1] ?? eventId },
    data: {
      testMode: true,
      calendarName: 'OpenLevel n8n Connection Test',
      startsAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      endsAt: new Date(Date.now() + 45 * 60_000).toISOString(),
    },
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        eventId,
        n8nStatus: result.status,
        acknowledgment: result.body,
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
