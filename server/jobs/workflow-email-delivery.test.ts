import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PgliteDatabase } from '../db/pglite-database'
import type { EmailMessage } from '../lib/sending/provider'
import { WorkflowActionsRepo } from '../repos/workflow-actions-repo'
import { WorkflowsRepo } from '../repos/workflows-repo'
import { runWorkflow } from './workflow-runner'

const SCHEMA = readFileSync(fileURLToPath(new URL('../../db/schema.sql', import.meta.url)), 'utf8')

async function harness() {
  const pg = new PGlite()
  await pg.exec(SCHEMA)
  const db = new PgliteDatabase(pg)
  const locationId = 'loc_email_test'
  const contactId = 'contact_email_test'

  await db.query("INSERT INTO locations (id, name, slug) VALUES ($1,'Email Test','email-test')", [locationId])
  await db.query(
    `INSERT INTO contacts (id, location_id, name, first_name, last_name, emails)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [contactId, locationId, 'Derek Sull', 'Derek', 'Sull', ['derek@example.com']],
  )

  const workflow = await new WorkflowsRepo(db, locationId).create({
    name: 'Appointment confirmation',
    triggerType: 'appointment_booked',
  })
  await new WorkflowActionsRepo(db, locationId).replaceAll(workflow.id, [
    {
      type: 'send_email',
      config: {
        subject: 'Appointment confirmed for {{first_name}}',
        body: 'Hi {{first_name}}, your appointment is confirmed.',
      },
    },
  ])

  return { db, locationId, contactId, workflowId: workflow.id }
}

test('send_email hands the rendered message to the configured provider and audits its id', async () => {
  const { db, locationId, contactId, workflowId } = await harness()
  const messages: EmailMessage[] = []

  const run = await runWorkflow(
    {
      db,
      resolveEmailSender: async () => ({
        ok: true,
        sender: {
          name: 'fake-email',
          async sendEmail(message) {
            messages.push(message)
            return { externalId: 'provider-message-123', provider: 'fake-email' }
          },
        },
      }),
    },
    { locationId, workflowId, contactId, triggerType: 'appointment_booked' },
  )

  expect(run.status).toBe('completed')
  expect(run.steps[0]?.status).toBe('done')
  expect(messages).toEqual([
    {
      to: 'derek@example.com',
      toName: 'Derek Sull',
      subject: 'Appointment confirmed for Derek',
      text: 'Hi Derek, your appointment is confirmed.',
    },
  ])

  const [event] = await db.query<{ payload: Record<string, unknown> }>(
    "SELECT payload FROM timeline_events WHERE contact_id=$1 AND type='automation_action' ORDER BY occurred_at DESC LIMIT 1",
    [contactId],
  )
  expect(event?.payload.status).toBe('sent')
  expect(event?.payload.externalId).toBe('provider-message-123')
  expect(event?.payload.provider).toBe('fake-email')
})

test('send_email is honestly skipped when the business has no provider configured', async () => {
  const { db, locationId, contactId, workflowId } = await harness()

  const run = await runWorkflow(
    {
      db,
      resolveEmailSender: async () => ({ ok: false, reason: 'no email provider connected' }),
    },
    { locationId, workflowId, contactId, triggerType: 'appointment_booked' },
  )

  expect(run.status).toBe('completed')
  expect(run.steps[0]?.status).toBe('skipped')
  expect(run.steps[0]?.detail).toContain('no email provider connected')

  const [event] = await db.query<{ payload: Record<string, unknown> }>(
    "SELECT payload FROM timeline_events WHERE contact_id=$1 AND type='automation_action' ORDER BY occurred_at DESC LIMIT 1",
    [contactId],
  )
  expect(event?.payload.status).toBe('not_sent')
})

test('a provider failure marks the workflow run failed and records an audit event', async () => {
  const { db, locationId, contactId, workflowId } = await harness()

  const run = await runWorkflow(
    {
      db,
      resolveEmailSender: async () => ({
        ok: true,
        sender: {
          name: 'fake-email',
          async sendEmail() {
            throw new Error('provider unavailable')
          },
        },
      }),
    },
    { locationId, workflowId, contactId, triggerType: 'appointment_booked' },
  )

  expect(run.status).toBe('failed')
  expect(run.steps[0]?.status).toBe('failed')
  expect(run.steps[0]?.detail).toContain('provider unavailable')

  const [event] = await db.query<{ payload: Record<string, unknown> }>(
    "SELECT payload FROM timeline_events WHERE contact_id=$1 AND type='automation_action' ORDER BY occurred_at DESC LIMIT 1",
    [contactId],
  )
  expect(event?.payload.status).toBe('failed')
  expect(event?.payload.reason).toBe('provider unavailable')
})
