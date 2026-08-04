const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_SERVICES = new Set(["calendar", "clickup", "both"]);

export function normalizeStaffEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeStaffEmailAliases(value, primaryEmail = "") {
  const primary = normalizeStaffEmail(primaryEmail);
  const source = Array.isArray(value) ? value : [];
  const aliases = new Map();

  source.forEach((item) => {
    const email = normalizeStaffEmail(typeof item === "string" ? item : item?.email);
    if (!email || email === primary || !EMAIL_PATTERN.test(email)) return;
    const requestedService = String(typeof item === "string" ? "both" : item?.service || "both").trim().toLowerCase();
    const service = EMAIL_SERVICES.has(requestedService) ? requestedService : "both";
    const existing = aliases.get(email);
    aliases.set(email, {
      email,
      service: existing && existing.service !== service ? "both" : service
    });
  });

  return [...aliases.values()];
}

export function staffProfileEmails(profile, service = "") {
  const requestedService = String(service || "").trim().toLowerCase();
  const aliases = normalizeStaffEmailAliases(profile?.email_aliases, profile?.email);
  return [...new Set([
    normalizeStaffEmail(profile?.email),
    ...aliases
      .filter((item) => !requestedService || item.service === "both" || item.service === requestedService)
      .map((item) => item.email)
  ].filter(Boolean))];
}

export function staffProfileHasEmail(profile, email, service = "") {
  const expected = normalizeStaffEmail(email);
  return Boolean(expected) && staffProfileEmails(profile, service).includes(expected);
}

export function preferredStaffProfileEmail(profile, service = "") {
  const requestedService = String(service || "").trim().toLowerCase();
  const aliases = normalizeStaffEmailAliases(profile?.email_aliases, profile?.email);
  const serviceAlias = aliases.find((item) => item.service === requestedService)
    || aliases.find((item) => item.service === "both");
  return serviceAlias?.email || normalizeStaffEmail(profile?.email);
}

export function validStaffEmail(value) {
  return EMAIL_PATTERN.test(normalizeStaffEmail(value));
}
