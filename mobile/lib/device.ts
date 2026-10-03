// lib/device.ts
// A random ID created on first launch and kept in secure storage.
// The backend binds it to the student so only their phone can mark attendance.
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import { Platform } from "react-native";

const KEY = "device_id";

export async function getDeviceId() {
  let id = await SecureStore.getItemAsync(KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(KEY, id);
  }
  return id;
}

export function getDeviceInfo() {
  return {
    deviceModel: Device.modelName ?? undefined,
    platform: (Platform.OS === "ios" ? "ios" : "android") as "ios" | "android",
  };
}
