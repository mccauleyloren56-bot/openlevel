import { PgBoss } from 'pg-boss'
import { type AgentReplyDeps, type AgentReplyPayload, handleAgentReply } from './agent-reply'
import { type WorkflowEvent, dispatchWorkflowEvent } from './workflow-dispatcher'
import {
  type WorkflowResumeRequest,
  type WorkflowRunnerDeps,
  runWorkflow,
} from './workflow-runner'

export const AGENT_REPLY_QUEUE = 'agent.reply.dispatch'
export const WORKFLOW_DISPATCH_QUEUE = 'workflow.dispatch'
export const WORKFLOW_RESUME_QUEUE = 'workflow.resume'

// Where a job lands once it has exhausted every retry. pg-boss copies the failed
// job's payload here instead of letting it vanish, so an automation that could
// not be delivered or resumed is preserved for an operator to inspect/requeue.
export const AGENT_REPLY_DLQ = 'agent.reply.dead'
export const WORKFLOW_DISPATCH_DLQ = 'workflow.dispatch.dead'
export const WORKFLOW_RESUME_DLQ = 'workflow.resume.dead'

/**
 * Retry policy for jobs that call out to a flaky dependency — the Anthropic API,
 * an email provider, or our own database. Exponential backoff with jitter spaces
 * attempts out, and the dead-letter target preserves anything that exhausts them.
 */
export const RESILIENT_RETRY = {
  retryLimit: 4,
  retryDelay: 5,
  retryBackoff: true,
  retryDelayMax: 300,
} as const

// One job per fetch. With a batch, a single throw fails the whole batch in
// pg-boss; at batchSize 1 a throw fails only that job.
export const SINGLE_JOB = { batchSize: 1 } as const

/**
 * Create every queue this app uses, each with its durability policy. Dead-letter
 * queues are created first because a queue's `deadLetter` must already exist.
 */
export async function ensureQueues(boss: Pick<PgBoss, 'createQueue'>): Promise<void> {
  await boss.createQueue(AGENT_REPLY_DLQ)
  await boss.createQueue(WORKFLOW_DISPATCH_DLQ)
  await boss.createQueue(WORKFLOW_RESUME_DLQ)
  await boss.createQueue(AGENT_REPLY_QUEUE, { ...RESILIENT_RETRY, deadLetter: AGENT_REPLY_DLQ })
  await boss.createQueue(WORKFLOW_DISPATCH_QUEUE, { ...RESILIENT_RETRY, deadLetter: WORKFLOW_DISPATCH_DLQ })
  await boss.createQueue(WORKFLOW_RESUME_QUEUE, { ...RESILIENT_RETRY, deadLetter: WORKFLOW_RESUME_DLQ })
}

/** Start pg-boss against DATABASE_URL and ensure our queues exist. */
export async function startBoss(connectionString: string): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString })
  await boss.start()
  await ensureQueues(boss)
  return boss
}

/** Register the worker that runs handleAgentReply for each queued job. */
export async function registerAgentReplyWorker(boss: PgBoss, deps: AgentReplyDeps): Promise<void> {
  await boss.work<AgentReplyPayload>(AGENT_REPLY_QUEUE, SINGLE_JOB, async (jobs) => {
    for (const job of jobs) {
      await handleAgentReply(deps, job.data)
    }
  })
}

/** Enqueue an agent-reply job — called by the webhook's onInbound hook. */
export async function enqueueAgentReply(boss: PgBoss, payload: AgentReplyPayload): Promise<void> {
  await boss.send(AGENT_REPLY_QUEUE, payload)
}

/**
 * Persist a paused workflow's continuation in Postgres. pg-boss startAfter uses
 * whole seconds, so round up rather than risk firing a reminder early.
 */
export async function enqueueWorkflowResume(
  boss: Pick<PgBoss, 'send'>,
  request: WorkflowResumeRequest,
  delayMs: number,
): Promise<void> {
  const startAfter = Math.max(0, Math.ceil(delayMs / 1000))
  const id = await boss.send(WORKFLOW_RESUME_QUEUE, request, { startAfter })
  if (!id) throw new Error('workflow resume job was not created')
}

/** Run durable workflow continuation jobs. Any throw is retried by pg-boss. */
export async function registerWorkflowResumeWorker(
  boss: PgBoss,
  deps: WorkflowRunnerDeps,
): Promise<void> {
  await boss.work<WorkflowResumeRequest>(WORKFLOW_RESUME_QUEUE, SINGLE_JOB, async (jobs) => {
    for (const job of jobs) {
      await runWorkflow(deps, job.data.payload, {
        runId: job.data.runId,
        fromPosition: job.data.fromPosition,
      })
    }
  })
}

/**
 * Register workflow dispatch and durable-resume workers. The runner receives a
 * pg-boss-backed deferResume callback, so every wait is stored in Postgres and
 * survives app restarts instead of relying on setTimeout memory.
 */
export async function registerWorkflowDispatchWorker(
  boss: PgBoss,
  deps: WorkflowRunnerDeps,
): Promise<void> {
  const durableDeps: WorkflowRunnerDeps = {
    ...deps,
    deferResume: (request, ms) => enqueueWorkflowResume(boss, request, ms),
  }

  await registerWorkflowResumeWorker(boss, durableDeps)
  await boss.work<WorkflowEvent>(WORKFLOW_DISPATCH_QUEUE, SINGLE_JOB, async (jobs) => {
    for (const job of jobs) {
      await dispatchWorkflowEvent(durableDeps, job.data)
    }
  })
}

/** Enqueue a workflow event — called by routes/webhooks when a trigger fires. */
export async function enqueueWorkflowEvent(boss: PgBoss, event: WorkflowEvent): Promise<void> {
  await boss.send(WORKFLOW_DISPATCH_QUEUE, event)
}
