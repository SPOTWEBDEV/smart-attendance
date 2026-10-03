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

// Loaded lazily so the rest of the app still opens in Expo Go
// (the Bluetooth library needs a development build).
async function loadBle(): Promise<BleModule> {
  try {
    return await import("munim-bluetooth");
  } catch {
    throw new Error("Bluetooth isn't available in this build. Use a development build, not Expo Go.");
  }
}

export async function prepareBroadcast() {
  const ble = await loadBle();
  const allowed = await ble.requestBluetoothPermission();
  if (!allowed) throw new Error("Bluetooth permission was not granted.");
  const enabled = await ble.isBluetoothEnabled();
  if (!enabled) throw new Error("Turn on Bluetooth to broadcast the class beacon.");
}

export async function broadcast(name: string) {
  const ble = await loadBle();
  try {
    ble.stopAdvertising();
  } catch {
    // nothing was advertising yet
  }
  ble.startAdvertising({ serviceUUIDs: [BEACON_SERVICE_UUID], localName: name });
}

export async function stopBroadcast() {
  try {
    const ble = await loadBle();
    ble.stopAdvertising();
  } catch {
    // ignore
  }
}

// ---------- student side: scanning ----------

export async function prepareScan() {
  const ble = await loadBle();
  const allowed = await ble.requestBluetoothPermission();
  if (!allowed) throw new Error("Bluetooth permission was not granted.");
  const enabled = await ble.isBluetoothEnabled();
  if (!enabled) throw new Error("Turn on Bluetooth so your phone can find the class beacon.");
}

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
    remove();
  };
}
