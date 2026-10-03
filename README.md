# Smart Attendance (ESUT)

Fingerprint-based attendance management system with Bluetooth proximity check.
Final-year project, Department of Computer Engineering, Enugu State University of Science and Technology.

## Two folders

```
smart-attendance/
  web/      Next.js + Prisma + Tailwind
            - landing page          (/)
            - admin dashboard       (/admin)
            - backend API           (/api/...)
  mobile/   Expo (React Native) app for students and lecturers
```

## Run order

1. **web/** (see `web/SETUP.md`)
   - `npm i`, create `.env` (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
   - `npx prisma migrate dev --name init`
   - `npx prisma db seed` (creates the first admin)
   - `npm run dev -- -H 0.0.0.0`
2. **mobile/** (see `mobile/SETUP.md`)
   - `npm i`, create `.env` with `EXPO_PUBLIC_API_URL=http://<your-computer-ip>:3000`
   - Bluetooth needs a development build: `npx expo run:android`

## Who does what

| Role | Where | What they do |
|---|---|---|
| Admin | Web dashboard | Adds lecturers, resets student phones, views attendance reports |
| Lecturer | Mobile app | Adds courses, starts a class session (broadcasts the beacon), sees who is present |
| Student | Mobile app | Registers (phone linked), adds courses, marks attendance with beacon + fingerprint |

## Attendance flow

Lecturer starts session -> phone broadcasts a rotating 6-digit code over Bluetooth ->
student phone detects it -> fingerprint/face unlock -> server checks session, enrollment,
registered phone and code -> attendance saved.
