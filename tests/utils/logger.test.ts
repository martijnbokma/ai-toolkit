import { describe, it, expect, vi } from 'vitest';
import { log, createSpinner } from '../../src/utils/logger.js';

describe('logger', () => {
  it('log.success should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.success('test message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log.info should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('info message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log.warn should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.warn('warn message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log.error should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.error('error message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log.dim should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.dim('dim message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log.synced should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.synced('from', 'to');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log.removed should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.removed('path');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log.dryRun should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.dryRun('action', 'target');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log.header should write to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.header('header');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('createSpinner should return an ora instance', () => {
    const spinner = createSpinner('Loading...');
    expect(spinner).toBeDefined();
    expect(typeof spinner.start).toBe('function');
    expect(typeof spinner.stop).toBe('function');
    expect(typeof spinner.succeed).toBe('function');
    expect(typeof spinner.fail).toBe('function');
  });
});
