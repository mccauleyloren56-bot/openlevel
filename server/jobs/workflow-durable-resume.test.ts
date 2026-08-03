import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PgliteDatabase } from '../db/pglite-database'
import { WorkflowActionsRepo } from '../repos/workflow-actions-repo'
import { WorkflowRunsRepo } from '../repos/workflow-runs-repo'
import { WorkflowsRepo } from '../repos/workflows-repo'
import {
  type WorkflowResumeRequest,
  runWorkflow,
} from './workflow-runner'

const SCHEMA = readFileSync(fileURLToPath(new URL('../../db/schema.sql', import.meta.url)), 'utf8')

async function harness() {
  const pg = new PGlite()
  await pg.exec(SCHEMA)
  const db = new PgliteDatabase(pg)
  const locationId = 'loc_durable'
  const contactId = 'contact_durable'

  await db.query("INSERT INTO locations (id, name, slug) VALUES ($1,'Durable Test','durable-test')", [
    locationId,
  ])
  await db.query(
    `INSERT INTO contacts (id, location_id, name, first_name, last_name)
     VALUES ($1,$2,$3,$4,$5)`,
    [contactId, locationId, 'Derek Sull', 'Derek', 'Sull'],
  )

  const workflow = await new WorkflowsRepo(db, locationId).create({
    name: 'Durable reminder',
    triggerType: 'appointment_booked',
  })
  await new WorkflowActionsRepo(db, locationId).replaceAll(workflow.id, [
    { type: 'add_tag', config: { tag: 'before-wait' } },
    { type: 'wait', config: { minutes: 5 } },
    { type: 'add_tag', config: { tag: 'after-wait' } },
  ])

  return {
    db,
    locationId,
    contactId,
    workflowId: workflow.id,
    payload: {
      locationId,
      workflowId: workflow.id,
      contactId,
      triggerType: 'appointment_booked',
    },
  }
}

test('a wait emits a serializable durable resume request that can finish after restart', async () => {
  const { db, contactId, payload } = await harness()
  let queued: WorkflowResumeRequest | null = null
  let delayMs = -1

  const paused = await runWorkflow(
    {
      db,
      schedule: () => {
        throw new Error('in-memory scheduler must not run when deferResume exists')
      },
      deferResume: async (request, ms) => {
        queued = request
        delayMs = ms
      },
    },
    payload,
  )

  expect(paused.status).toBe('waiting')
  expect(delayMs).toBe(300_000)
  expect(queued).toEqual({
    payload,
    runId: paused.id,
    fromPosition: 2,
  })

  // Simulate a fresh process consuming the persisted pg-boss job. The callback
  // closure is gone; only the serialized request remains.
  const request = queued!
  await runWorkflow(
    { db },
    request.payload,
    { runId: request.runId, fromPosition: request.fromPosition },
  )

  const finished = await new WorkflowRunsRepo(db, payload.locationId).get(paused.id)
  expect(finished?.status).toBe('completed')

  const [contact] = await db.query<{ tags: string[] }>('SELECT tags FROM contacts WHERE id=$1', [contactId])
  expect(contact?.tags).toEqual(expect.arrayContaining(['before-wait', 'after-wait']))
})

test('a durable scheduling failure closes the run as failed instead of pretending a reminder is queued', async () => {
  const { db, payload } = await harness()

  const run = await runWorkflow(
    {
      db,
      deferResume: async () => {
        throw new Error('queue unavailable')
      },
    },
    payload,
  )

  expect(run.status).toBe('failed')
  expect(run.steps.at(-1)?.status).toBe('failed')
  expect(run.steps.at(-1)?.detail).toContain('queue unavailable')
})
