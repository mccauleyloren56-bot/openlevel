import type { WorkflowDispatch, WorkflowEvent } from '../jobs/workflow-dispatcher'

export interface N8nWebhookOptions {
  url: string
  secret: string
  fetchImpl?: typeof fetch
  now?: () => Date
}

export interface N8nWebhookAck {
  status: number
  body: unknown
}

function required(value: string, name: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${name} is required`)
  return trimmed
}

function parseResponse(raw: string): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

/**
 * Sends OpenLevel workflow events to one authenticated n8n Webhook node.
 * The shared secret is transmitted only in X-OpenLevel-Key and is never included
 * in an error message or response payload.
 */
export function createN8nWebhookDispatch(options: N8nWebhookOptions): WorkflowDispatch & {
  send(event: WorkflowEvent): Promise<N8nWebhookAck>
} {
  const url = required(options.url, 'N8N_WEBHOOK_URL')
  const secret = required(options.secret, 'N8N_WEBHOOK_SECRET')
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => new Date())

  const send = async (event: WorkflowEvent): Promise<N8nWebhookAck> => {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-openlevel-key': secret,
        'x-openlevel-event': event.triggerType,
        ...(event.eventId ? { 'x-openlevel-event-id': event.eventId } : {}),
      },
      body: JSON.stringify({
        source: 'openlevel',
        version: 1,
        sentAt: now().toISOString(),
        event,
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      const detail = raw.slice(0, 300) || response.statusText || 'no response body'
      throw new Error(`n8n webhook rejected OpenLevel event (${response.status}): ${detail}`)
    }

    return { status: response.status, body: parseResponse(raw) }
  }

  const dispatch = (event: WorkflowEvent) => send(event).then(() => undefined)
  return Object.assign(dispatch, { send })
}
