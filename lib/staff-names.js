function formatStaffNameToken(token) {
  if (!token) return "";
  if (token.toUpperCase() === "BMG") return "BMG";
  return token
    .split(/([-'])/)
    .map((part) => {
      if (part === "-" || part === "'") return part;
      const lower = part.toLocaleLowerCase("it-IT");
      return `${lower.charAt(0).toLocaleUpperCase("it-IT")}${lower.slice(1)}`;
    })
    .join("");
}

export function normalizeStaffFullName(value) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  if (cleaned.includes("@")) return cleaned;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map(formatStaffNameToken)
    .join(" ");
}

export function isCompleteStaffName(value) {
  const normalized = normalizeStaffFullName(value);
  if (!normalized || normalized.includes("@")) return false;
  return normalized.split(" ").filter((part) => /\p{L}/u.test(part)).length >= 2;
}

export function staffNameParts(value) {
  const normalized = normalizeStaffFullName(value);
  if (!normalized || normalized.includes("@")) return { firstName: "", lastName: "" };
  const [firstName = "", ...surnameParts] = normalized.split(" ");
  return { firstName, lastName: surnameParts.join(" ") };
}
