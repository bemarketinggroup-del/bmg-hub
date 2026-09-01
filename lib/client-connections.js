const CONNECTIONS_START = "<!-- BMG_CLIENT_CONNECTIONS";
const CONNECTIONS_END = "BMG_CLIENT_CONNECTIONS -->";

function cleanFolderId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : "";
}
function connectionBlockPattern() {
  return /\n?<!-- BMG_CLIENT_CONNECTIONS\s*\n([\s\S]*?)\nBMG_CLIENT_CONNECTIONS -->\n?/g;
}

export function visibleClientNotes(value) {
  return String(value || "").replace(connectionBlockPattern(), "\n").trim();
}

export function clientConnectionSettings(value) {
  const notes = String(value || "");
  const matches = [...notes.matchAll(connectionBlockPattern())];
  if (!matches.length) return { graphics_folder_id: "", video_folder_id: "" };
  try {
    const parsed = JSON.parse(matches.at(-1)[1]);
    return {
      graphics_folder_id: cleanFolderId(parsed?.graphics_folder_id),
      video_folder_id: cleanFolderId(parsed?.video_folder_id)
    };
  } catch {
    return { graphics_folder_id: "", video_folder_id: "" };
  }
}

export function notesWithClientConnections(notes, settings = {}) {
  const visible = visibleClientNotes(notes);
  const connections = {
    graphics_folder_id: cleanFolderId(settings.graphics_folder_id),
    video_folder_id: cleanFolderId(settings.video_folder_id)
  };
  const block = `${CONNECTIONS_START}\n${JSON.stringify(connections)}\n${CONNECTIONS_END}`;
  return [visible, block].filter(Boolean).join("\n\n");
}
