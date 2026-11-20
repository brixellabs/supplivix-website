import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startHeartbeat,
  pingBackend,
  getHeartbeatState,
  subscribeHeartbeatState,
} from '../services/heartbeat';

describe('Heartbeat & Keep-Alive Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes initial heartbeat state', () => {
    const state = getHeartbeatState();
    expect(state).toBeDefined();
    expect(typeof state.isServerAwake).toBe('boolean');
    expect(typeof state.isPinging).toBe('boolean');
  });

  it('subscribes and receives state updates', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeHeartbeatState(callback);
    expect(callback).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('performs pingBackend call with correct headers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'healthy', database: 'connected' }),
    });

    await pingBackend('forced');
    expect(global.fetch).toHaveBeenCalled();

    const fetchUrl = global.fetch.mock.calls[0][0];
    const fetchOptions = global.fetch.mock.calls[0][1];

    expect(fetchUrl).toContain('/health/');
    expect(fetchOptions.headers['X-Heartbeat']).toBe('1');
    expect(fetchOptions.cache).toBe('no-store');

    const state = getHeartbeatState();
    expect(state.isServerAwake).toBe(true);
    expect(state.lastStatusCode).toBe(200);
  });

  it('initializes and cleans up event listeners', () => {
    const addEventSpy = vi.spyOn(window, 'addEventListener');
    const removeEventSpy = vi.spyOn(window, 'removeEventListener');

    const cleanup = startHeartbeat();
    expect(typeof cleanup).toBe('function');
    expect(addEventSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function));

    cleanup();
    expect(removeEventSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(removeEventSpy).toHaveBeenCalledWith('online', expect.any(Function));
  });
});

