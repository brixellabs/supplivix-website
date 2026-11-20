import { getApiBaseUrl } from './api';

// Render free-tier services spin down after 15 minutes of inactivity.
// Pinging every 4 minutes (240,000 ms) guarantees the server stays warm and responsive.
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
const MIN_PING_GAP_MS = 45 * 1000; // Minimum 45 seconds between pings
const TAB_RETURN_THRESHOLD_MS = 60 * 1000; // Ping on tab return if >60s since last ping
const USER_ACTIVITY_THRESHOLD_MS = 3 * 60 * 1000; // Warm up on active interaction if >3m idle

const heartbeatState = {
  isRunning: false,
  isPinging: false,
  lastPingTime: null,
  lastSuccessfulPingTime: null,
  consecutiveFailures: 0,
  isServerAwake: true,
  lastStatusCode: null,
};

const listeners = new Set();

function notifyListeners() {
  const snapshot = { ...heartbeatState };
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Ignore listener errors
    }
  });
}

export function subscribeHeartbeatState(listener) {
  listeners.add(listener);
  try {
    listener({ ...heartbeatState });
  } catch {
    // Ignore error
  }
  return () => listeners.delete(listener);
}

export function getHeartbeatState() {
  return { ...heartbeatState };
}

/**
 * Sends a lightweight keep-alive ping to the backend health endpoint.
 * Bypasses intermediate caching to ensure Render inactivity timers reset.
 */
export async function pingBackend(triggerReason = 'interval') {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (
    heartbeatState.lastPingTime &&
    now - heartbeatState.lastPingTime < MIN_PING_GAP_MS &&
    triggerReason !== 'forced'
  ) {
    return;
  }

  if (heartbeatState.isPinging) {
    return;
  }

  heartbeatState.isPinging = true;
  heartbeatState.lastPingTime = now;
  notifyListeners();

  const baseUrl = getApiBaseUrl();
  const primaryUrl = `${baseUrl.replace(/\/+$/, '')}/health/?quick=1&splv_hb=${now}`;
  const fallbackUrl = `https://supplivix-backend.onrender.com/api/v1/health/?quick=1&splv_hb=${now}`;

  const sendRequest = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'X-Heartbeat': '1',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    let response;
    try {
      response = await sendRequest(primaryUrl);
    } catch (primaryErr) {
      // If primary fails and we are not on localhost, attempt Render fallback URL
      if (
        typeof window !== 'undefined' &&
        window.location.hostname !== '127.0.0.1' &&
        window.location.hostname !== 'localhost' &&
        primaryUrl !== fallbackUrl
      ) {
        response = await sendRequest(fallbackUrl);
      } else {
        throw primaryErr;
      }
    }

    if (response && (response.ok || response.status === 200 || response.status === 304)) {
      heartbeatState.isServerAwake = true;
      heartbeatState.consecutiveFailures = 0;
      heartbeatState.lastSuccessfulPingTime = Date.now();
      heartbeatState.lastStatusCode = response.status;
    } else {
      heartbeatState.lastStatusCode = response ? response.status : 0;
      heartbeatState.consecutiveFailures += 1;
      if (heartbeatState.consecutiveFailures >= 3) {
        heartbeatState.isServerAwake = false;
      }
    }
  } catch (error) {
    heartbeatState.consecutiveFailures += 1;
    heartbeatState.lastStatusCode = 0;
    if (heartbeatState.consecutiveFailures >= 3) {
      heartbeatState.isServerAwake = false;
    }
  } finally {
    heartbeatState.isPinging = false;
    notifyListeners();
  }
}

/**
 * Initializes the automated keep-alive heartbeat engine.
 * Attaches event listeners for tab focus, visibility change, and online recovery.
 * Returns a cleanup function.
 */
export function startHeartbeat() {
  if (typeof window === 'undefined') return () => {};
  if (heartbeatState.isRunning) {
    return () => {};
  }

  heartbeatState.isRunning = true;

  // Initial wake-up ping shortly after mount
  const initialTimer = setTimeout(() => {
    pingBackend('init');
  }, 1200);

  // Regular periodic keep-alive interval
  const intervalId = setInterval(() => {
    pingBackend('interval');
  }, HEARTBEAT_INTERVAL_MS);

  // Tab visibility change: when user switches back to Supplivix tab
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const elapsed = Date.now() - (heartbeatState.lastPingTime || 0);
      if (elapsed >= TAB_RETURN_THRESHOLD_MS) {
        pingBackend('tab_visible');
      }
    }
  };

  // Window focus listener
  const handleFocus = () => {
    const elapsed = Date.now() - (heartbeatState.lastPingTime || 0);
    if (elapsed >= TAB_RETURN_THRESHOLD_MS) {
      pingBackend('window_focus');
    }
  };

  // Network back online listener
  const handleOnline = () => {
    pingBackend('network_online');
  };

  // Opportunistic user activity warm-up
  const handleUserActivity = () => {
    const elapsed = Date.now() - (heartbeatState.lastPingTime || 0);
    if (elapsed >= USER_ACTIVITY_THRESHOLD_MS) {
      pingBackend('user_activity');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleOnline);
  window.addEventListener('pointerdown', handleUserActivity, { passive: true });
  window.addEventListener('keydown', handleUserActivity, { passive: true });

  return () => {
    heartbeatState.isRunning = false;
    clearTimeout(initialTimer);
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('pointerdown', handleUserActivity);
    window.removeEventListener('keydown', handleUserActivity);
  };
}
