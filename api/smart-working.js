import { handleSmartWorking } from "../lib/smart-working.js";

export default async function handler(request, response) {
  return handleSmartWorking(request, response);
}
