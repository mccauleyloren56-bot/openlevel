import type { TriggerType } from '../lib/automation-vocab'
import type { WorkflowRun } from '../repos/workflow-runs-repo'
import { WorkflowsRepo } from '../repos/workflows-repo'
import { type WorkflowRunnerDeps, runWorkflow } from './workflow-runner'

/** A resource attached to an event, such as the appointment that was booked. */
export interface WorkflowEventResource {
  type: string
  id: string
}

/**
 * A real thing that happened in a location. Optional resource/data fields let an
 * external automation system such as n8n receive the useful event details while
 * OpenLevel's internal workflow runner continues using the core trigger fields.
 */
export interface WorkflowEvent {
  /** Stable idempotency key. Appointment events use the appointment id. */
  eventId?: string
  locationId: string
  triggerType: TriggerType
  contactId: string | null
  resource?: WorkflowEventResource
  data?: Record<string, unknown>
}

/**
 * What a route calls when something happens that workflows can trigger on. In
 * production this is queued off the request path; tests may run it in-process.
 */
export type WorkflowDispatch = (event: WorkflowEvent) => void | Promise<void>

/** Fan one event out to every live OpenLevel workflow wired to that trigger. */
export async function dispatchWorkflowEvent(
  deps: WorkflowRunnerDeps,
  event: WorkflowEvent,
): Promise<WorkflowRun[]> {
  const live = await new WorkflowsRepo(deps.db, event.locationId).listLiveByTrigger(
    event.triggerType,
  )

  const runs: WorkflowRun[] = []
  for (const workflow of live) {
    runs.push(
      await runWorkflow(deps, {
        locationId: event.locationId,
        workflowId: workflow.id,
        contactId: event.contactId,
        triggerType: event.triggerType,
      }),
    )
  }
  return runs
}
