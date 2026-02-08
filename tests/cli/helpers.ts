import { vi } from 'vitest';

/**
 * Mock process.exit to throw instead of actually exiting.
 * Returns a spy that can be checked for calls.
 */
export function mockProcessExit() {
  const spy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit(${code})`);
  }) as any);
  return spy;
}

/**
 * Suppress console.log output during tests.
 */
export function suppressConsole() {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  return logSpy;
}
