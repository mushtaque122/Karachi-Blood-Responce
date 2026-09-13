import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const memoryStore: Record<string, string> = {};

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    memoryStore[key] = value;
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memoryStore[key] || null;
  }
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    delete memoryStore[key];
  }
}
