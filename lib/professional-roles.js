export const PROFESSIONAL_ROLE_OPTIONS = Object.freeze([
  { value: "unspecified", label: "Non impostato" },
  { value: "graphic_designer", label: "Grafico" },
  { value: "social_media_manager", label: "Social media manager" },
  { value: "videomaker", label: "Videomaker" },
  { value: "custom", label: "Personalizzato" }
]);

const PROFESSIONAL_ROLE_VALUES = new Set(PROFESSIONAL_ROLE_OPTIONS.map((item) => item.value));

export function normalizeProfessionalRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROFESSIONAL_ROLE_VALUES.has(normalized) ? normalized : "unspecified";
}

export function normalizeProfessionalRoleLabel(value, role = "unspecified") {
  if (normalizeProfessionalRole(role) !== "custom") return null;
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80) || null;
}

export function professionalRoleLabel(profile) {
  const role = normalizeProfessionalRole(profile?.professional_role);
  if (role === "custom") return normalizeProfessionalRoleLabel(profile?.professional_role_label, role) || "Ruolo personalizzato";
  return PROFESSIONAL_ROLE_OPTIONS.find((item) => item.value === role)?.label || "Non impostato";
}

export function isGraphicDesigner(profile) {
  return normalizeProfessionalRole(profile?.professional_role) === "graphic_designer";
}
