/**
 * Shared Console Mock (Gold Standard)
 *
 * RULES:
 * 1. Single source of truth for console mocking across all test layers
 * 2. Patch in beforeEach — never inline jest.spyOn per test
 * 3. Captures all output for assertion; suppresses noise during test runs
 */

export interface ConsoleCaptured {
  log: string[];
  warn: string[];
  error: string[];
}

/** Install console spies and return captured output reference */
export function mockConsole(): ConsoleCaptured {
  const captured: ConsoleCaptured = { log: [], warn: [], error: [] };

  jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    captured.log.push(args.map(String).join(' '));
  });
  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    captured.warn.push(args.map(String).join(' '));
  });
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    captured.error.push(args.map(String).join(' '));
  });

  return captured;
}

/** Restore all console spies */
export function restoreConsole(): void {
  jest.restoreAllMocks();
}
