# Mobile app setup

## 1. Create the project
```bash
npx create-expo-app@latest attendance-app
cd attendance-app
npm run reset-project   # clears the starter screens (or just delete the starter app/ and components/ folders)
npx expo install expo-secure-store expo-crypto expo-device
```
Then copy the `app/`, `components/` and `lib/` folders from this project over yours.

## 2. Path alias
The code imports from `@/...`. The default Expo template already maps `@/*` to the project root in `tsconfig.json`:
```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

## 3. .env
```
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```
Use your computer's local network IP (not `localhost`), and keep the phone on the same Wi-Fi.
Start the Next.js server with `next dev -H 0.0.0.0` so the phone can reach it.

## 4. Run
```bash
npx expo start
```
Everything in this step also works in Expo Go. Bluetooth (later) needs a development build.

## Flow
Welcome (2s) -> Role screen -> Login (student or lecturer) -> role home.
Students can create an account from the login screen. Already signed-in users skip straight to their home.

---

# Lecturer screens + Bluetooth beacon

## Extra packages
```bash
npx expo install expo-keep-awake munim-bluetooth react-native-nitro-modules
```

## app.json (add)
```json
{
  "expo": {
    "plugins": ["munim-bluetooth"],
    "ios": {
      "infoPlist": {
        "NSBluetoothAlwaysUsageDescription": "Used to broadcast and detect the class attendance beacon",
        "NSBluetoothPeripheralUsageDescription": "Used to broadcast the class attendance beacon"
      }
    },
    "android": {
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_ADVERTISE",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

## Build a development build (Expo Go can't do Bluetooth)
```bash
npx expo run:android          # needs Android Studio, phone on USB
# or
eas build --profile development --platform android
```

## Testing the beacon
You need two real phones (or one phone plus the dev code shown on the lecturer screen):
1. Phone A: log in as lecturer, open a course, tap Start session. It should say "Broadcasting".
2. Phone B: a free scanner app (e.g. nRF Connect) should show a device named like `ATxxxx123456`
   advertising the service UUID in `lib/ble.ts`. The digits change every 30 seconds.
Keep the lecturer's app open in the foreground. iOS stops sending the name when the app is in the background.

---

# Student screens

## Extra package
```bash
npx expo install expo-local-authentication
```

## app.json (add to "plugins")
```json
["expo-local-authentication", { "faceIDPermission": "Confirm it's you when marking attendance" }]
```
So the plugins list becomes: `["munim-bluetooth", ["expo-local-authentication", {...}]]`.
Rebuild the development build after adding plugins or native packages.

## Testing the full flow (needs 2 Android phones)
1. Backend running; admin adds a lecturer; lecturer adds a course.
2. Phone B: register a student, tap "Add or drop courses", add that course.
3. Phone A (lecturer): open the course, Start session. Wait for "Broadcasting".
4. Phone B: the class appears under "Open now". Tap Mark, wait for the beacon, scan your fingerprint.
5. Phone A should show the student under Present within 5 seconds.
Then test the failures: Bluetooth off, wrong phone, window ended, closed session, marking twice.
