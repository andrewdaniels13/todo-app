// logger.ts — structured logger respecting LOG_LEVEL
import { env } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export function createLogger(level: LogLevel): Logger {
  const minRank = LEVEL_RANK[level];
  return {
    debug(msg, ...args) {
      if (LEVEL_RANK.debug >= minRank) console.debug(msg, ...args);
    },
    info(msg, ...args) {
      if (LEVEL_RANK.info >= minRank) console.log(msg, ...args);
    },
    warn(msg, ...args) {
      if (LEVEL_RANK.warn >= minRank) console.warn(msg, ...args);
    },
    error(msg, ...args) {
      if (LEVEL_RANK.error >= minRank) console.error(msg, ...args);
    },
  };
}

export const logger: Logger = createLogger(env.LOG_LEVEL);
