export const COMPLETED_TASK_RETENTION_DAYS = 10;

const COMPLETED_STATUSES = new Set([
  "complete", "completed", "completato", "completata", "completate",
  "chiuso", "chiusa", "closed", "done", "finito", "fatto"
]);

export function isCompletedTaskStatus(status) {
  return COMPLETED_STATUSES.has(String(status || "").trim().toLowerCase());
}

function timestampValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function taskCompletionTimestamp(task) {
  const payload = task?.payload || {};
  const candidates = [
    task?.completed_at,
    task?.date_closed,
    task?.date_done,
    payload.date_closed,
    payload.date_done,
    payload.date_updated
  ];
  for (const candidate of candidates) {
    const timestamp = timestampValue(candidate);
    if (timestamp) return timestamp;
  }
  return null;
}

export function isRecentlyCompletedTask(task, now = Date.now()) {
  if (!isCompletedTaskStatus(task?.status)) return false;
  const completedAt = taskCompletionTimestamp(task);
  if (!completedAt) return false;
  const retentionMs = COMPLETED_TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return completedAt <= now && completedAt >= now - retentionMs;
}

export function isTaskVisibleDuringCompletionRetention(task, now = Date.now()) {
  return !isCompletedTaskStatus(task?.status) || isRecentlyCompletedTask(task, now);
}
