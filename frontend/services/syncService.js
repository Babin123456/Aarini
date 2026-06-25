import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = '@aarini_pending_sync';

/**
 * Merge local and remote cycle arrays, deduplicating by startDate.
 * Remote entries take precedence for matching dates (they're the source of truth
 * if the backend accepted them). Local-only entries are preserved and flagged for upload.
 */
export function mergeCycles(local, remote) {
  const remoteMap = new Map();
  for (const cycle of remote) {
    remoteMap.set(cycle.startDate, cycle);
  }

  const localOnly = [];
  for (const cycle of local) {
    if (!remoteMap.has(cycle.startDate)) {
      localOnly.push(cycle);
    }
  }

  const merged = [...remote, ...localOnly];
  merged.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return { merged, localOnly };
}

/**
 * Push local-only entries to the backend.
 * Returns the list of entries that failed to sync (for retry later).
 */
export async function pushPendingToBackend(entries, backendUrl, headers) {
  const failed = [];

  for (const entry of entries) {
    try {
      const res = await fetch(`${backendUrl}/add-cycle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          startDate: entry.startDate,
          endDate: entry.endDate,
          flowIntensity: entry.flowIntensity || null,
          symptoms: entry.symptoms || [],
          mood: entry.mood || null,
        }),
      });
      if (!res.ok) failed.push(entry);
    } catch {
      failed.push(entry);
    }
  }

  return failed;
}

/**
 * Save entries that couldn't be synced for retry on next app launch.
 */
export async function savePendingEntries(entries) {
  if (entries.length === 0) {
    await AsyncStorage.removeItem(PENDING_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(entries));
}

/**
 * Load any previously failed sync entries.
 */
export async function loadPendingEntries() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Full sync flow:
 * 1. Load local cycles + pending entries
 * 2. Fetch remote cycles
 * 3. Merge (deduplicate by startDate)
 * 4. Push local-only entries to backend
 * 5. Save any failures for retry
 * 6. Return final merged array + sync status
 */
export async function syncCycles({ storageKey, backendUrl, headers }) {
  const localRaw = await AsyncStorage.getItem(storageKey);
  const local = localRaw ? JSON.parse(localRaw) : [];
  const pending = await loadPendingEntries();
  const allLocal = [...local, ...pending.filter((p) => !local.some((l) => l.startDate === p.startDate))];

  let remote = [];
  let prediction = null;
  let online = true;

  try {
    const res = await fetch(`${backendUrl}/cycles`, { headers });
    if (res.ok) {
      const data = await res.json();
      remote = data.cycles || [];
      prediction = data.prediction || null;
    } else {
      online = false;
    }
  } catch {
    online = false;
  }

  const { merged, localOnly } = mergeCycles(allLocal, remote);

  let syncStatus = 'synced';
  if (!online) {
    syncStatus = 'offline';
  } else if (localOnly.length > 0) {
    syncStatus = 'syncing';
    const failed = await pushPendingToBackend(localOnly, backendUrl, headers);
    await savePendingEntries(failed);
    syncStatus = failed.length > 0 ? 'pending' : 'synced';
  } else {
    await savePendingEntries([]);
  }

  await AsyncStorage.setItem(storageKey, JSON.stringify(merged));

  return { cycles: merged, prediction, syncStatus };
}
