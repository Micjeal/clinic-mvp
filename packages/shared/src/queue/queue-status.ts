export const queueStatuses = ["waiting_triage", "in_triage", "waiting_clinician", "with_clinician", "completed", "cancelled"] as const;
export type QueueStatus = (typeof queueStatuses)[number];
export const queueStatusLabels: Record<QueueStatus, string> = { waiting_triage: "Waiting for triage", in_triage: "In triage", waiting_clinician: "Ready for clinician", with_clinician: "With clinician", completed: "Completed", cancelled: "Cancelled" };
export const queuePriorities = ["routine", "priority", "urgent", "emergency"] as const;
export type QueuePriority = (typeof queuePriorities)[number];
export const queuePriorityLabels: Record<QueuePriority, string> = { routine: "Routine", priority: "Priority", urgent: "Urgent", emergency: "Emergency" };
const transitions: Record<QueueStatus, readonly QueueStatus[]> = { waiting_triage: ["in_triage", "cancelled"], in_triage: ["waiting_clinician", "cancelled"], waiting_clinician: ["with_clinician", "cancelled"], with_clinician: ["completed", "cancelled"], completed: [], cancelled: [] };
export function canTransitionQueue(from: QueueStatus, to: QueueStatus) { return transitions[from]?.includes(to) ?? false; }
export function isQueuePriority(value: string): value is QueuePriority { return queuePriorities.includes(value as QueuePriority); }
