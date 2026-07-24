import { jsonHeaders, readJson, requireUser, supabaseFetch } from "../api/_auth.js";

const GENERAL_CONVERSATION = "general";
const MESSAGE_LIMIT = 200;
const MESSAGE_MAX_LENGTH = 4000;

export async function handleTeamChat(request, response) {
  const headers = jsonHeaders("GET,POST,OPTIONS");
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const session = await requireUser(request, response, { headers, module: "chat" });
  if (!session) return;

  try {
    if (request.method === "GET") {
      const requestUrl = new URL(request.url, `https://${request.headers.host || "localhost"}`);
      const payload = await chatPayload(session.profile, requestUrl.searchParams.get("conversation"));
      sendJson(response, 200, payload, headers);
      return;
    }

    if (request.method === "POST") {
      const body = await readJson(request);
      const payload = await createMessage(session.profile, body);
      sendJson(response, 201, payload, headers);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" }, headers);
  } catch (error) {
    sendJson(response, Number(error.status) || 500, { error: publicError(error) }, headers);
  }
}

export function directConversationKey(firstProfileId, secondProfileId) {
  return `direct:${[String(firstProfileId || ""), String(secondProfileId || "")].sort().join(":")}`;
}

export function messageConversationKey(message) {
  if (!message?.recipient_profile_id) return GENERAL_CONVERSATION;
  return directConversationKey(message.sender_profile_id, message.recipient_profile_id);
}

async function chatPayload(profile, requestedConversation) {
  const team = await loadActiveTeam();
  const teamById = new Map(team.map((member) => [String(member.id), member]));
  const selectedConversation = normalizeConversation(requestedConversation, profile.id, teamById);
  await markConversationRead(profile.id, selectedConversation);

  const [messages, reads] = await Promise.all([
    loadVisibleMessages(profile.id),
    loadReads(profile.id)
  ]);
  const readByConversation = new Map(reads.map((item) => [item.conversation_key, item.last_read_at]));
  readByConversation.set(selectedConversation, new Date().toISOString());

  const availableConversations = [
    { key: GENERAL_CONVERSATION, kind: "general", profile: null },
    ...team
      .filter((member) => String(member.id) !== String(profile.id))
      .map((member) => ({
        key: directConversationKey(profile.id, member.id),
        kind: "direct",
        profile: publicTeamMember(member)
      }))
  ];

  const conversations = availableConversations.map((conversation) => {
    const related = messages.filter((message) => messageConversationKey(message) === conversation.key);
    const lastMessage = related[related.length - 1] || null;
    const lastReadAt = readByConversation.get(conversation.key) || "";
    const unreadCount = related.filter((message) => (
      String(message.sender_profile_id) !== String(profile.id)
      && (!lastReadAt || String(message.created_at) > String(lastReadAt))
    )).length;
    return {
      ...conversation,
      unread_count: unreadCount,
      last_message: lastMessage ? publicMessage(lastMessage, teamById) : null
    };
  }).sort((left, right) => {
    if (left.key === GENERAL_CONVERSATION) return -1;
    if (right.key === GENERAL_CONVERSATION) return 1;
    return String(right.last_message?.created_at || "").localeCompare(String(left.last_message?.created_at || ""));
  });

  const selectedMessages = messages
    .filter((message) => messageConversationKey(message) === selectedConversation)
    .slice(-MESSAGE_LIMIT)
    .map((message) => publicMessage(message, teamById));

  return {
    profile: publicTeamMember(profile),
    team: team.map(publicTeamMember),
    selected_conversation: selectedConversation,
    conversations,
    messages: selectedMessages,
    total_unread: conversations.reduce((total, conversation) => total + conversation.unread_count, 0)
  };
}

async function createMessage(profile, body) {
  const message = String(body.message || "").trim();
  if (!message) throw requestError(400, "Scrivi un messaggio prima di inviarlo");
  if (message.length > MESSAGE_MAX_LENGTH) throw requestError(400, `Il messaggio può contenere al massimo ${MESSAGE_MAX_LENGTH} caratteri`);

  const team = await loadActiveTeam();
  const teamById = new Map(team.map((member) => [String(member.id), member]));
  const conversation = normalizeConversation(body.conversation, profile.id, teamById);
  const recipientProfileId = conversation === GENERAL_CONVERSATION
    ? null
    : conversation.slice(7).split(":").find((profileId) => profileId !== String(profile.id)) || null;

  const insertResult = await supabaseFetch("/team_chat_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      sender_profile_id: profile.id,
      recipient_profile_id: recipientProfileId,
      body: message
    })
  });
  if (!insertResult.ok) throw new Error("Non riesco a inviare il messaggio");
  const rows = await insertResult.json();
  const saved = rows[0];
  await notifyRecipients(profile, conversation, message, team).catch(() => {
    // Il messaggio è già stato salvato: un problema di notifica non deve
    // indurre l'utente a reinviarlo e creare un duplicato.
  });
  return {
    message: publicMessage(saved, teamById),
    conversation
  };
}

function normalizeConversation(value, currentProfileId, teamById) {
  const requested = String(value || GENERAL_CONVERSATION).trim();
  if (!requested || requested === GENERAL_CONVERSATION) return GENERAL_CONVERSATION;
  if (!requested.startsWith("direct:")) throw requestError(400, "Conversazione non valida");
  const participants = requested.slice(7).split(":");
  if (participants.length !== 2 || !participants.includes(String(currentProfileId))) {
    throw requestError(403, "Conversazione non disponibile");
  }
  const otherProfileId = participants.find((profileId) => profileId !== String(currentProfileId));
  if (!otherProfileId || !teamById.has(otherProfileId)) throw requestError(404, "Utente non disponibile");
  return directConversationKey(currentProfileId, otherProfileId);
}

async function loadActiveTeam() {
  const response = await supabaseFetch(
    "/staff_profiles?select=id,full_name,email,role,active&active=eq.true&order=full_name.asc"
  );
  if (!response.ok) throw new Error("Utenti del team non disponibili");
  return response.json();
}

async function loadVisibleMessages(profileId) {
  const response = await supabaseFetch(
    `/team_chat_messages?select=id,sender_profile_id,recipient_profile_id,body,created_at,updated_at&or=(recipient_profile_id.is.null,sender_profile_id.eq.${profileId},recipient_profile_id.eq.${profileId})&order=created_at.asc&limit=1000`
  );
  if (!response.ok) throw new Error("Messaggi temporaneamente non disponibili");
  return response.json();
}

async function loadReads(profileId) {
  const response = await supabaseFetch(
    `/team_chat_reads?select=conversation_key,last_read_at&profile_id=eq.${profileId}`
  );
  if (!response.ok) throw new Error("Stato dei messaggi non disponibile");
  return response.json();
}

async function markConversationRead(profileId, conversationKey) {
  const now = new Date().toISOString();
  const readResult = await supabaseFetch("/team_chat_reads?on_conflict=profile_id,conversation_key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      profile_id: profileId,
      conversation_key: conversationKey,
      last_read_at: now,
      updated_at: now
    })
  });
  if (!readResult.ok) throw new Error("Lettura della conversazione non aggiornata");
  await supabaseFetch(
    `/staff_notifications?profile_id=eq.${profileId}&source_type=eq.chat&source_id=eq.${encodeURIComponent(conversationKey)}&dismissed_at=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ dismissed_at: now })
    }
  );
}

async function notifyRecipients(sender, conversationKey, message, team) {
  const recipients = conversationKey === GENERAL_CONVERSATION
    ? team.filter((member) => String(member.id) !== String(sender.id))
    : team.filter((member) => conversationKey.includes(String(member.id)) && String(member.id) !== String(sender.id));
  if (!recipients.length) return;
  const senderName = sender.full_name || sender.email || "Un membro del team";
  const occurredAt = new Date().toISOString();
  const rows = recipients.map((recipient) => ({
    profile_id: recipient.id,
    source_type: "chat",
    source_id: conversationKey,
    title: `Nuovo messaggio di ${senderName}`,
    message: message.slice(0, 180),
    link: null,
    occurred_at: occurredAt,
    dismissed_at: null
  }));
  const response = await supabaseFetch(
    "/staff_notifications?on_conflict=profile_id,source_type,source_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows)
    }
  );
  if (!response.ok) throw new Error("Messaggio inviato, ma notifica non aggiornata");
}

function publicMessage(message, teamById) {
  const sender = teamById.get(String(message.sender_profile_id));
  return {
    id: message.id,
    sender_profile_id: message.sender_profile_id,
    recipient_profile_id: message.recipient_profile_id,
    body: message.body,
    created_at: message.created_at,
    updated_at: message.updated_at,
    sender: publicTeamMember(sender || { id: message.sender_profile_id, full_name: "Utente", email: "" })
  };
}

function publicTeamMember(profile) {
  return {
    id: profile.id,
    full_name: profile.full_name || profile.email || "Utente",
    email: profile.email || "",
    role: profile.role || "staff"
  };
}

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicError(error) {
  return Number(error?.status) < 500 ? String(error.message || "Richiesta non valida") : "Chat temporaneamente non disponibile";
}

function sendJson(response, status, payload, headers) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}
