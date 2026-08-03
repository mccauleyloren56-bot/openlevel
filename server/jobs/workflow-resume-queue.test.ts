import {
  WORKFLOW_DISPATCH_QUEUE,
  WORKFLOW_RESUME_DLQ,
  WORKFLOW_RESUME_QUEUE,
  enqueueWorkflowResume,
  ensureQueues,
  registerWorkflowDispatchWorker,
} from './boss'
import type { WorkflowResumeRequest } from './workflow-runner'

test('ensureQueues creates the durable resume queue after its dead-letter queue', async () => {
  const created: { name: string; options?: Record<string, unknown> }[] = []
  const boss = {
    createQueue: async (name: string, options?: Record<string, unknown>) => {
      created.push({ name, options })
    },
  }

  await ensureQueues(boss as never)

  const order = created.map((entry) => entry.name)
  expect(order.indexOf(WORKFLOW_RESUME_DLQ)).toBeLessThan(order.indexOf(WORKFLOW_RESUME_QUEUE))
  expect(created.find((entry) => entry.name === WORKFLOW_RESUME_QUEUE)?.options?.deadLetter).toBe(
    WORKFLOW_RESUME_DLQ,
  )
  expect(created.find((entry) => entry.name === WORKFLOW_RESUME_QUEUE)?.options?.retryBackoff).toBe(true)
})

test('enqueueWorkflowResume stores the continuation with a rounded-up delay', async () => {
  const sent: { name: string; data: unknown; options: Record<string, unknown> }[] = []
  const boss = {
    send: async (name: string, data: unknown, options: Record<string, unknown>) => {
      sent.push({ name, data, options })
      return 'resume-job-id'
    },
  }
  const request: WorkflowResumeRequest = {
    payload: {
      locationId: 'locA',
      workflowId: 'wfA',
      contactId: 'contactA',
      triggerType: 'appointment_booked',
    },
    runId: 'runA',
    fromPosition: 2,
  }

  await enqueueWorkflowResume(boss as never, request, 300_001)

  expect(sent).toEqual([
    {
      name: WORKFLOW_RESUME_QUEUE,
      data: request,
      options: { startAfter: 301 },
    },
  ])
})

test('workflow registration starts both dispatch and durable resume workers', async () => {
  const workers: { name: string; options: Record<string, unknown> }[] = []
  const boss = {
    work: async (name: string, options: Record<string, unknown>, _handler: unknown) => {
      workers.push({ name, options })
      return `${name}-worker`
    },
    send: async () => 'job-id',
  }

  await registerWorkflowDispatchWorker(boss as never, { db: {} as never })

  expect(workers.map((worker) => worker.name)).toEqual([
    WORKFLOW_RESUME_QUEUE,
    WORKFLOW_DISPATCH_QUEUE,
  ])
  expect(workers.every((worker) => worker.options.batchSize === 1)).toBe(true)
})
