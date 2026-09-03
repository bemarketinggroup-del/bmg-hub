const FOLDER_MIME = "application/vnd.google-apps.folder";

export const CLIENT_DRIVE_LIBRARIES = Object.freeze({
  graphics: Object.freeze({
    id: process.env.GOOGLE_DRIVE_GRAPHICS_ROOT_ID || "1gunBs8jx6e8FjcLy_4Ybd2ox_iMBmNgr",
    label: "GRAFICHE",
    description: "Grafiche del cliente",
    tone: "graphics"
  }),
  video: Object.freeze({
    id: process.env.GOOGLE_DRIVE_VIDEO_ROOT_ID || "13hXCP23GSQuUXWkkG_t9t1NjP0VWVo07",
    label: "VIDEO",
    description: "Video del cliente",
    tone: "video"
  })
});

const CLIENT_FOLDER_ALIASES = Object.freeze({
  BELVEDERE: Object.freeze(["MACELLERIA BELVEDERE"]),
  CITYSTONE: Object.freeze(["CITYSTONE"])
});

export function normalizeDriveLibraryName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function findClientLibraryFolder(files, clientName) {
  const normalizedClient = normalizeDriveLibraryName(clientName);
  if (!normalizedClient) return null;

  const folders = (Array.isArray(files) ? files : []).filter((file) => file?.mimeType === FOLDER_MIME);
  const candidates = [
    normalizedClient,
    ...(CLIENT_FOLDER_ALIASES[normalizedClient] || []).map(normalizeDriveLibraryName)
  ];

  for (const candidate of candidates) {
    const match = folders.find((folder) => normalizeDriveLibraryName(folder.name) === candidate);
    if (match) return match;
  }
  return null;
}

export async function resolveClientDriveLibrary(source, clientName, listFolder, connections = {}) {
  const config = CLIENT_DRIVE_LIBRARIES[source];
  if (!config) return null;
  const explicitFolderId = String(connections?.[`${source}_folder_id`] || "").trim();
  if (explicitFolderId) {
    return {
      source,
      id: explicitFolderId,
      name: config.label,
      description: config.description,
      tone: config.tone
    };
  }

  let files = await listFolder(config.id);
  let folder = findClientLibraryFolder(files, clientName);
    // A newly shared root or a newly created client folder may have produced an
    // empty cached result moments earlier. Retry once bypassing the Drive cache.
    if (!folder) {
      files = await listFolder(config.id, { fresh: true });
      folder = findClientLibraryFolder(files, clientName);
    }
  if (!folder) return null;
  return {
    source,
    id: folder.id,
    name: config.label,
    description: config.description,
    tone: config.tone
  };
}

export async function resolveClientDriveLibraries(clientName, listFolder, connections = {}) {
  const entries = await Promise.all(Object.keys(CLIENT_DRIVE_LIBRARIES).map((source) => (
    resolveClientDriveLibrary(source, clientName, listFolder, connections)
  )));
  return entries.filter(Boolean);
}
