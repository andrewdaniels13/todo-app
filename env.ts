// env.ts — Environment variable validation (fail-fast)

const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
const VALID_NODE_ENVS = ['development', 'staging', 'production'] as const;

type LogLevel = typeof VALID_LOG_LEVELS[number];
type NodeEnv = typeof VALID_NODE_ENVS[number];

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function validateEnum<T extends string>(
  key: string,
  value: string,
  valid: readonly T[],
  defaultValue: T
): T {
  if (valid.includes(value as T)) return value as T;
  console.warn(`[env] Invalid ${key}="${value}". Defaulting to "${defaultValue}".`);
  return defaultValue;
}

export const env = {
  NODE_ENV: validateEnum(
    'NODE_ENV',
    getEnv('NODE_ENV', 'development'),
    VALID_NODE_ENVS,
    'development'
  ) as NodeEnv,
  LOG_LEVEL: validateEnum(
    'LOG_LEVEL',
    getEnv('LOG_LEVEL', 'info'),
    VALID_LOG_LEVELS,
    'info'
  ) as LogLevel,
};
