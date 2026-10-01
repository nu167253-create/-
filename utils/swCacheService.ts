import { RequestItem } from '../types/request';
import { getIsSimulatedOffline } from './offlineSync';

export const DATA_CACHE_NAME = 'cctv-requests-cache-v3';

/**
 * Check if the device is effectively in offline mode (either browser offline or simulated offline)
 */
export function isDeviceOffline(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return getIsSimulatedOffline();
}

/**
 * Save user's requests history directly into the Service Worker Cache Storage
 * This ensures that even when offline, requests are preserved and accessible.
 */
export async function saveRequestsToSwCache(requests: RequestItem[]): Promise<boolean> {
  if (typeof window === 'undefined' || !Array.isArray(requests)) {
    return false;
  }

  let success = false;

  // 1. Direct Cache Storage API write
  if ('caches' in window) {
    try {
      const cache = await caches.open(DATA_CACHE_NAME);
      const jsonString = JSON.stringify(requests);
      const headers = {
        'Content-Type': 'application/json',
        'X-SW-Cached-At': new Date().toISOString(),
        'X-SW-Item-Count': String(requests.length)
      };

      const resp1 = new Response(jsonString, { status: 200, headers });
      const resp2 = new Response(jsonString, { status: 200, headers });

      await Promise.all([
        cache.put('/api/requests', resp1),
        cache.put('/api/my-requests', resp2)
      ]);
      success = true;
    } catch (err) {
      console.warn('[SW Cache Service] Cache Storage API put failed:', err);
    }
  }

  // 2. Post message to active Service Worker controller as dual layer
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_MY_REQUESTS',
        payload: requests
      });
      success = true;
    } catch (err) {
      console.warn('[SW Cache Service] SW postMessage failed:', err);
    }
  }

  return success;
}

/**
 * Retrieve cached user requests history from Service Worker Cache Storage
 */
export async function getRequestsFromSwCache(): Promise<RequestItem[] | null> {
  if (typeof window === 'undefined') return null;

  // 1. Check Service Worker Cache Storage directly
  if ('caches' in window) {
    try {
      const cache = await caches.open(DATA_CACHE_NAME);
      const match = (await cache.match('/api/requests')) || (await cache.match('/api/my-requests'));
      if (match) {
        const data = await match.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('[SW Cache Service] Error reading from caches:', err);
    }
  }

  // 2. Fallback: try querying /api/requests which the SW fetch handler intercepts
  try {
    const res = await fetch('/api/requests');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    // Expected when fetch fails and SW is inactive
  }

  return null;
}

/**
 * Query active Service Worker for cached requests using MessageChannel
 */
export async function queryServiceWorkerForRequests(): Promise<RequestItem[] | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const messageChannel = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 1500);

      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timer);
        if (event.data && event.data.success && Array.isArray(event.data.requests)) {
          resolve(event.data.requests);
        } else {
          resolve(null);
        }
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHED_MY_REQUESTS' },
        [messageChannel.port2]
      );
    } catch (e) {
      resolve(null);
    }
  });
}
