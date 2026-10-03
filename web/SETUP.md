# Setup

## 1. Install
```bash
npm i @prisma/client zod jose bcryptjs
npm i -D prisma tsx @types/bcryptjs
```

## 2. package.json (add)
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

## 3. .env
```
DATABASE_URL="postgresql://user:password@localhost:5432/attendance"
JWT_SECRET="put-a-long-random-string-here"
ADMIN_EMAIL="admin@school.edu"
ADMIN_PASSWORD="ChangeMe123!"
ADMIN_NAME="System Admin"
```

## 4. Migrate + seed
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

## 5. Try it
```bash
# login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.edu","password":"ChangeMe123!"}'

# admin adds a lecturer
curl -X POST http://localhost:3000/api/admin/lecturers \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"fullName":"Dr. Ade","email":"ade@school.edu","password":"Lecturer123","staffId":"STF001","department":"Computer Engineering"}'

# login as lecturer, then add a course
curl -X POST http://localhost:3000/api/courses \
  -H "Authorization: Bearer <LECTURER_TOKEN>" -H "Content-Type: application/json" \
  -d '{"code":"CPE 401","title":"Embedded Systems","unit":3,"semester":"First","session":"2025/2026"}'
```

---

# Landing page + admin dashboard

- `/` is the public landing page (`app/page.tsx`). `/admin/login` is the admin sign-in. The rest of `/admin/*` needs an admin login.
- The logo is `public/logo.jpg`. To use it as the browser tab icon, add a copy as `app/icon.jpg` (Next.js picks it up automatically).
- Add `NEXT_PUBLIC_APK_URL=https://...` to `.env` once the APK is hosted (Drive, GitHub release, etc.) and the landing page shows a download button.
- Tailwind classes only, no extra config. Brand colour is the maroon from the logo (`#681609`).
