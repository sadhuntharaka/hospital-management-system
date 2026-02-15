# Hospital & Dispensary CRM (Sri Lanka) MVP

React + Vite + TypeScript + Tailwind frontend, Firebase Auth/Firestore/Storage backend, and Netlify Functions for privileged operations.

## Core architecture
- Multi-tenant clinic data in `/clinics/{clinicId}/...`
- Access control with Firebase custom claims: `clinicId`, `role`
- Roles: `admin`, `doctor`, `receptionist`, `pharmacy`, `manager`
- Password hardening: bootstrap users start with default password and are forced to change it on first login

## Netlify Functions included
- `createAdmin`: create first clinic + admin user
- `createUser`: admin creates additional users
- `setClaims`: admin recovery for existing Auth users (set claims + profile)
- `bootstrapClinic`: one-time bootstrap clinic + 5 role users (secret-protected)
- `generateInvoiceNumber`, `voidInvoice`

## Required environment variables
### Frontend (Vite)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### Functions (server-only)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (stringified service account JSON)
- `FIREBASE_PROJECT_ID`
- `BOOTSTRAP_SECRET` (long random secret)
- `CLINIC_DEFAULT_PASSWORD=Clinic@2026#ChangeMe`

## Local run
```bash
cp .env.example .env
npm install
npm run dev
```

## Deploy Firebase rules
```bash
firebase deploy --only firestore:rules,storage
```

## Deploy to Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node version pinned in `netlify.toml` (`NODE_VERSION = 18`)

## Bootstrap clinic after deploy (recommended)
```bash
curl -X POST 'https://<your-site>.netlify.app/.netlify/functions/bootstrapClinic' \
  -H 'Content-Type: application/json' \
  -H 'X-BOOTSTRAP-SECRET: <BOOTSTRAP_SECRET>' \
  --data '{"clinicName":"City Care","emailDomain":"myclinic.lk"}'
```

### Bootstrap response schema
```json
{
  "clinicId": "<clinicId>",
  "accounts": [
    { "role": "admin", "email": "admin@myclinic.lk", "uid": "..." },
    { "role": "doctor", "email": "doctor@myclinic.lk", "uid": "..." },
    { "role": "receptionist", "email": "reception@myclinic.lk", "uid": "..." },
    { "role": "pharmacy", "email": "pharmacy@myclinic.lk", "uid": "..." },
    { "role": "manager", "email": "manager@myclinic.lk", "uid": "..." }
  ],
  "note": "Default password set; must change on first login."
}
```

## First login behavior
1. Sign in with generated role emails.
2. Use default password: `Clinic@2026#ChangeMe`.
3. App forces redirect to `/change-password`.
4. After password change, role-based access is available.

## Claims recovery for existing Auth users (admin only)
Use this when a user was created manually in Firebase Auth and has no claims/profile.

```bash
curl -X POST 'https://<your-site>.netlify.app/.netlify/functions/setClaims' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ADMIN_ID_TOKEN>' \
  --data '{
    "uid": "OAFecvxfXYcivYCB5YLnCCuhQn02",
    "clinicId": "<YOUR_CLINIC_ID>",
    "role": "admin",
    "email": "sadhuntharaka4@gmail.com",
    "displayName": "Sadhun Tharaka"
  }'
```

## Security notes
- Never commit service account JSON.
- Frontend Firebase config is public by design; enforce security in rules + claims.
- Privileged operations must run in Netlify Functions only.
