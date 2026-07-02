import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const CHAT_HISTORY_KEY = '@aarini_chat_history';
const MAX_PERSISTED_MESSAGES = 50;

async function deriveKey(userId) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA512,
    `aarini-chat-${userId}-history-key`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

function xorCipher(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export async function saveChatHistory(userId, history) {
  const trimmed = history.slice(-MAX_PERSISTED_MESSAGES * 2);
  const json = JSON.stringify(trimmed);
  const key = await deriveKey(userId);
  const encrypted = xorCipher(json, key);
  const encoded = btoa(
    [...encrypted].map((c) => String.fromCharCode(c.charCodeAt(0) & 0xff)).join('')
  );
  await AsyncStorage.setItem(CHAT_HISTORY_KEY, encoded);
}

export async function loadChatHistory(userId) {
  const stored = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
  if (!stored) return [];

  try {
    const key = await deriveKey(userId);
    const raw = atob(stored);
    const decrypted = xorCipher(raw, key);
    const history = JSON.parse(decrypted);
    if (!Array.isArray(history)) return [];
    return history.slice(-MAX_PERSISTED_MESSAGES * 2);
  } catch {
    return [];
  }
}

export async function clearChatHistory() {
  await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
}
