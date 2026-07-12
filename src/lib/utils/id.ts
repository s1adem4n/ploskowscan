export function createId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
