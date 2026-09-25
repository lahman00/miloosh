/** Opaque correlation identity, not a user identity or proof of a human click. */
export function validEventId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{16,64}$/.test(value);
}

export function createEventId(): string {
  try { return crypto.randomUUID(); } catch {
    return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  }
}
