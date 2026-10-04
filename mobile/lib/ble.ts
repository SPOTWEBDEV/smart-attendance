import { Linking, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// lib/ble.ts
// Shared by the lecturer (broadcast) and student (scan) sides.
//
// Why the code is inside the Bluetooth *name*: on iOS a phone can only advertise
// a local name and service UUIDs (no custom data), so the name is the one place
// that works on both Android and iOS.
//
//   name = "AT" + last 4 chars of the session id + 6-digit rotating code
//   e.g.   "ATk9x2482913"

// Fixed id for this app. Students scan only for this service UUID.
export const BEACON_SERVICE_UUID = "5f1c8e30-6a3b-4d52-9c7e-2b8a4f0d91e6";

export const sessionTag = (sessionId: string) => sessionId.slice(-4).toLowerCase();

export const makeBeaconName = (sessionId: string, code: string) =>
  `AT${sessionTag(sessionId)}${code}`;

export function parseBeaconName(name?: string | null) {
  const m = /^AT([a-z0-9]{4})(\d{6})$/i.exec(name ?? "");
  return m ? { tag: m[1].toLowerCase(), code: m[2] } : null;
}

// ---------- lecturer side: broadcasting ----------

type BleModule = typeof import("munim-bluetooth");

// Expo Go does not contain the Bluetooth native code. Trying to load it there makes a red error
// screen appear, so we don't even try.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Loaded lazily so the rest of the app still opens without the Bluetooth library.
async function loadBle(): Promise<BleModule> {
  if (isExpoGo) {
    throw new Error(
      "Bluetooth beacons don't work in Expo Go. Install the development build of this app instead (see SETUP.md)."
    );
  }
  try {
    return await import("munim-bluetooth");
  } catch {
    throw new Error("Bluetooth isn't available in this build. Use the development build, not Expo Go.");
  }
}

export type BluetoothProblem = {
  kind: "unavailable" | "permission" | "off";
  message: string;
};

// Is Bluetooth ready to use? Returns null when it is, or what is wrong.
// askPermission = false only checks whether Bluetooth is switched on (no permission pop-up),
// so it is safe to call every few seconds.
export async function checkBluetooth(askPermission = true): Promise<BluetoothProblem | null> {
  let ble: BleModule;
  try {
    ble = await loadBle();
  } catch (e) {
    return { kind: "unavailable", message: e instanceof Error ? e.message : "Bluetooth isn't available." };
  }

  try {
    if (askPermission) {
      const allowed = await ble.requestBluetoothPermission();
      if (!allowed) {
        return { kind: "permission", message: "Bluetooth permission is needed. Allow it in your phone's settings." };
      }
    }
    const enabled = await ble.isBluetoothEnabled();
    if (!enabled) {
      return { kind: "off", message: "Bluetooth is turned off. Turn it on to continue." };
    }
  } catch (e) {
    return { kind: "unavailable", message: e instanceof Error ? e.message : "Couldn't check Bluetooth." };
  }
  return null;
}

// Apps can't switch Bluetooth on silently, so we send the user to the right settings screen.
export function openBluetoothSettings() {
  if (Platform.OS === "android") {
    Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS").catch(() => Linking.openSettings());
  } else {
    Linking.openSettings();
  }
}

// Tracks whether we are advertising, so "stop" is only ever called when something is running
// (stopping something that never started can throw inside the native Bluetooth code).
let advertising = false;
let epoch = 0; // bumped on every stop, so a start that was still loading doesn't switch the beacon back on

export async function broadcast(name: string) {
  const mine = epoch;
  const ble = await loadBle();
  if (mine !== epoch) return; // the session was closed while we were getting ready

  if (advertising) {
    try {
      ble.stopAdvertising(); // swap the old code for the new one
    } catch {
      // ignore
    }
  }
  ble.startAdvertising({ serviceUUIDs: [BEACON_SERVICE_UUID], localName: name });
  advertising = true;
}

export async function stopBroadcast() {
  epoch += 1;
  if (!advertising) return;
  advertising = false;
  try {
    const ble = await loadBle();
    ble.stopAdvertising();
  } catch {
    // ignore
  }
}

// ---------- student side: scanning ----------

export type BeaconSighting = { tag: string; code: string; rssi?: number };

// Starts scanning for the class beacon. Calls onBeacon every time one is seen
// (the code changes every 30s, so duplicates must be allowed).
// Returns a function that stops the scan.
export async function startBeaconScan(onBeacon: (b: BeaconSighting) => void) {
  const ble = await loadBle();

  // Prefer the advertised localName: the OS can cache the plain device name,
  // but localName comes from the live advertisement.
  const remove = ble.addDeviceFoundListener((device) => {
    const parsed = parseBeaconName(device.localName ?? device.name);
    if (parsed) {
      onBeacon({
        ...parsed,
        rssi: typeof device.rssi === "number" ? Math.round(device.rssi) : undefined,
      });
    }
  });

  ble.startScan({
    serviceUUIDs: [BEACON_SERVICE_UUID],
    allowDuplicates: true,
    scanMode: "lowLatency",
  });

  return () => {
    try {
      ble.stopScan();
    } catch {
      // ignore
    }
    try {
      remove();
    } catch {
      // ignore
    }
  };
}
