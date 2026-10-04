# Mobile app setup

Needs Node 22.13 or newer. Bluetooth does not work in Expo Go, so you build a development build once.

```bash
npm install
npx expo install --fix       # lines every Expo package up with the installed SDK
cp .env.example .env         # set EXPO_PUBLIC_API_URL to http://<your-computer-ip>:3000
```

## Run on a phone (development build)
1. Phone: turn on Developer options and USB debugging, plug it in.
2. `npx expo run:android` (needs Android Studio / the Android SDK). This installs the app on the phone.
3. Next time, just `npx expo start --dev-client`.

No Android Studio? Use EAS instead: `npx eas-cli login`, then `npx eas-cli build -p android --profile development`, install the APK it gives you, and run `npx expo start --dev-client`.

## Demo APK
1. Deploy the web folder on HTTPS (see `web/SETUP.md`).
2. Put that URL in `eas.json` (preview profile) and `.env`.
3. `npx eas-cli build -p android --profile preview` gives you an installable APK.
   Plain `http://` only works because `app.json` enables cleartext traffic for Android; turn that off for a real release.

## Add the icon later
`app.json` has no app icon yet. When you have a larger logo (1024x1024 PNG), add `"icon": "./assets/icon.png"`.

## Test the full flow (two Android phones)
1. Backend running; the admin adds a lecturer; the lecturer adds a course.
2. Phone B: register a student, tap "Add or drop courses", add the course.
3. Phone A (lecturer): open the course, tap Start session, wait for "Broadcasting".
4. Phone B: the class appears under "Open now". Tap Mark, wait for the beacon, scan your fingerprint.
5. Phone A shows the student under Present within 5 seconds.
Then test the failures: Bluetooth off, wrong phone, window ended, closed session, marking twice.

## Lecturer first sign-in
A new lecturer signs in with their email and the starting password (their email address unless the admin set a shared one).
The app then opens the Change password screen and nothing else works until a new password is saved.
