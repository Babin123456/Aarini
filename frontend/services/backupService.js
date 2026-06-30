import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const BACKUP_VERSION = 1;
const BACKUP_MAGIC = 'AARINI_BACKUP';

const HEALTH_DATA_KEYS = [
  '@aarini_mood_entries',
  'predictionNotificationsEnabled',
  'notificationPreferences',
  'scheduledNotificationIds',
];

const CYCLE_STORAGE_PREFIX = 'cycles:';

async function deriveBackupKey(userId) {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    `aarini-backup-${userId}-key-v1`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return hash;
}

function xorCipher(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function computeChecksum(data) {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function createBackup(userId) {
  const allKeys = await AsyncStorage.getAllKeys();

  const healthData = {};

  for (const key of HEALTH_DATA_KEYS) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) healthData[key] = value;
  }

  const cycleKeys = allKeys.filter((k) => k.startsWith(CYCLE_STORAGE_PREFIX));
  for (const key of cycleKeys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) healthData[key] = value;
  }

  const onboardingKeys = allKeys.filter((k) => k.includes('onboarding'));
  for (const key of onboardingKeys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) healthData[key] = value;
  }

  const backup = {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    userId,
    entryCount: Object.keys(healthData).length,
    data: healthData,
  };

  const jsonPayload = JSON.stringify(backup);
  const checksum = computeChecksum(jsonPayload);
  const withChecksum = JSON.stringify({ checksum, payload: jsonPayload });

  const key = await deriveBackupKey(userId);
  const encrypted = xorCipher(withChecksum, key);
  const encoded = btoa(
    Array.from(new Uint8Array(
      [...encrypted].map((c) => c.charCodeAt(0))
    ), (byte) => String.fromCharCode(byte)).join('')
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `aarini-backup-${timestamp}.aab`;
  const filePath = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(filePath, encoded);

  return { filePath, filename, entryCount: backup.entryCount };
}

export async function shareBackupFile(filePath) {
  if (Platform.OS === 'web') return;
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(filePath, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Save Aarini Backup',
  });
}

export async function restoreFromBackup(fileContent, userId) {
  const key = await deriveBackupKey(userId);

  let decrypted;
  try {
    const raw = atob(fileContent);
    decrypted = xorCipher(raw, key);
  } catch {
    return { success: false, error: 'Invalid backup file format' };
  }

  let parsed;
  try {
    parsed = JSON.parse(decrypted);
  } catch {
    return { success: false, error: 'Backup file is corrupted or was created by a different account' };
  }

  const { checksum, payload } = parsed;
  if (!checksum || !payload) {
    return { success: false, error: 'Backup file structure is invalid' };
  }

  const computedChecksum = computeChecksum(payload);
  if (computedChecksum !== checksum) {
    return { success: false, error: 'Backup integrity check failed (data may be tampered)' };
  }

  let backup;
  try {
    backup = JSON.parse(payload);
  } catch {
    return { success: false, error: 'Backup payload is corrupted' };
  }

  if (backup.magic !== BACKUP_MAGIC) {
    return { success: false, error: 'Not a valid Aarini backup file' };
  }

  if (backup.version > BACKUP_VERSION) {
    return { success: false, error: `Backup version ${backup.version} is newer than this app supports (v${BACKUP_VERSION}). Update Aarini first.` };
  }

  const data = backup.data;
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Backup contains no data' };
  }

  let restoredCount = 0;
  const conflicts = [];

  for (const [storageKey, value] of Object.entries(data)) {
    const existing = await AsyncStorage.getItem(storageKey);
    if (existing && existing !== value) {
      conflicts.push(storageKey);
    }
    await AsyncStorage.setItem(storageKey, value);
    restoredCount++;
  }

  return {
    success: true,
    restoredCount,
    conflicts,
    backupDate: backup.createdAt,
    originalUserId: backup.userId,
  };
}

export async function validateBackupFile(fileContent, userId) {
  const key = await deriveBackupKey(userId);

  try {
    const raw = atob(fileContent);
    const decrypted = xorCipher(raw, key);
    const parsed = JSON.parse(decrypted);
    const backup = JSON.parse(parsed.payload);

    return {
      valid: true,
      version: backup.version,
      createdAt: backup.createdAt,
      entryCount: backup.entryCount,
      originalUserId: backup.userId,
      sameUser: backup.userId === userId,
    };
  } catch {
    return { valid: false };
  }
}
