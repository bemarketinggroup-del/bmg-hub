const TEAM_TASK_LIST_NAME = "task del team";

function normalized(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function isOperationalTeamTask(task) {
  const listName = task?.list_name || task?.list?.name || task?.list || "";
  const container = normalized([
    listName,
    task?.folder_name || task?.folder?.name || task?.folder,
    task?.space_name || task?.space?.name || task?.space
  ].filter(Boolean).join(" "));
  const tags = normalized((task?.tags || []).map((tag) => typeof tag === "string" ? tag : tag?.name).filter(Boolean).join(" "));
  const parentId = task?.parent_id || task?.payload?.parent || task?.parent;

  if (parentId) return false;
  if (!normalized(listName).includes(TEAM_TASK_LIST_NAME)) return false;
  if (/\b(template|templates|modelli|modello)\b/.test(container) || /\b(template|templates|modelli|modello)\b/.test(tags)) return false;
  if (/\b(documenti|documents|documentation|docs)\b/.test(container)) return false;
  return true;
}
