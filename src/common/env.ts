function getFirstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function getRequiredEnv(name: string | string[]): string {
  const names = Array.isArray(name) ? name : [name];
  const value = getFirstEnv(names);
  if (!value) {
    throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
  }
  return value;
}

export function getEnvNumber(name: string | string[], fallback: number): number {
  const names = Array.isArray(name) ? name : [name];
  const value = getFirstEnv(names);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${names.join(' or ')}`);
  }

  return parsed;
}
