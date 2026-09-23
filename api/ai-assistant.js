import { handleAiAssistant } from "../lib/ai-assistant.js";

export default async function handler(request, response) {
  return handleAiAssistant(request, response);
}
