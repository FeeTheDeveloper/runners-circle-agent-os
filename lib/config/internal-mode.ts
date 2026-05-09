function normalizeBoolean(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isInternalOperatorModeEnabled() {
  return normalizeBoolean(process.env.INTERNAL_OPERATOR_MODE);
}

export function getInternalOperatorModeSummary() {
  const enabled = isInternalOperatorModeEnabled();

  return {
    enabled,
    authBypassEnabled: enabled,
    billingBypassEnabled: enabled,
    elevatedOperatorPermissions: enabled,
    auditLoggingPreserved: true,
    billingArchitecturePreserved: true,
  };
}
