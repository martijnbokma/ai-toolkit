import { describe, it, expect } from 'vitest';
import { getAdapter, getAllAdapters, getEnabledAdapters } from '../../src/editors/registry.js';
import type { ToolkitConfig } from '../../src/core/types.js';

describe('EditorRegistry', () => {
  it('should return all 21 adapters', () => {
    const adapters = getAllAdapters();
    expect(adapters.length).toBe(21);
  });

  it('should get adapter by name', () => {
    const cursor = getAdapter('cursor');
    expect(cursor).toBeDefined();
    expect(cursor!.name).toBe('cursor');
    expect(cursor!.directories.rules).toBe('.cursor/rules');
  });

  it('should return undefined for unknown adapter', () => {
    const unknown = getAdapter('nonexistent' as any);
    expect(unknown).toBeUndefined();
  });

  it('should return all adapters when no editors configured', () => {
    const config: ToolkitConfig = { version: '1.0', editors: {} };
    const enabled = getEnabledAdapters(config);
    expect(enabled.length).toBe(21);
  });

  it('should filter adapters based on config', () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: {
        cursor: true,
        windsurf: true,
        claude: false,
      },
    };
    const enabled = getEnabledAdapters(config);
    expect(enabled.map((a) => a.name)).toEqual(['cursor', 'windsurf']);
  });

  it('should support object-style editor config', () => {
    const config: ToolkitConfig = {
      version: '1.0',
      editors: {
        cursor: { enabled: true },
        claude: { enabled: false },
      },
    };
    const enabled = getEnabledAdapters(config);
    expect(enabled.map((a) => a.name)).toEqual(['cursor']);
  });

  it('each adapter should have required properties', () => {
    for (const adapter of getAllAdapters()) {
      expect(adapter.name).toBeTruthy();
      expect(adapter.directories.rules).toBeTruthy();
      expect(['flat', 'subdirectory']).toContain(adapter.fileNaming);
    }
  });
});
