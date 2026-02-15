# Hospital & Dispensary CRM (Sri Lanka) MVP

Production-ready MVP scaffold using **React + Vite + TypeScript + Tailwind**, Firebase Auth/Firestore/Storage, and Netlify Functions for privileged operations.

## Implemented modules
- Auth + protected routing with custom-claims awareness (`clinicId`, `role`)
- Patient CRM list/create/profile
- Appointments list with live `onSnapshot`
- Walk-in queue token generation via Firestore transaction
- Consultation/prescription capture + print
- Billing invoice number generation via secure server function + print
- Pharmacy FEFO dispense transaction with stock movement writes
- Admin/reporting/stock routes scaffolded for expansion
- Firebase Firestore/Storage rules enforcing role-based access
- Netlify functions: `createAdmin`, `createUser`, `setClaims`, `generateInvoiceNumber`, `voidInvoice`
- Seed CLI for first-run setup

## Firebase project values
Project ID: `hospital-management-syst-855b0`

Frontend config (already in `.env.example`):
- `VITE_FIREBASE_API_KEY=AIzaSyDIdn-H7PhF5bDrokCLI2CZPNP64Uy65x0`
- `VITE_FIREBASE_AUTH_DOMAIN=hospital-management-syst-855b0.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID=hospital-management-syst-855b0`
- `VITE_FIREBASE_STORAGE_BUCKET=hospital-management-syst-855b0.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=396437714755`
- `VITE_FIREBASE_APP_ID=1:396437714755:web:645cfba7554bf6414da1f6`
- `VITE_FIREBASE_MEASUREMENT_ID=G-Z8PFW2V5QQ`

## Firebase console checklist
1. Enable Auth > Email/Password.
2. Create Firestore database (production mode).
3. Create Storage bucket.
4. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
5. Ensure users are assigned custom claims (`clinicId`, `role`) using function/seed script.

## Local development
```bash
cp .env.example .env
npm install
npm run dev
```

## Netlify environment variables
Set in Netlify Site settings:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (**stringified JSON**, never commit file)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_URL` (optional)

## Deploy to Netlify
1. Push repository.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Functions directory: `netlify/functions`
5. Confirm SPA redirect via `public/_redirects` or `netlify.toml`.

## Seed / first run
### Option A: Netlify function (preferred)
POST `/.netlify/functions/createAdmin` with:
```json
{
  "clinicName": "City Care",
  "adminEmail": "admin@citycare.lk",
  "adminPassword": "StrongPass123!",
  "adminName": "Main Admin"
}
```

Response includes `{ uid, clinicId }`. Keep the `clinicId`; it is required for user recovery and role management.

### First admin recovery (existing Auth user)
If a Firebase Auth user exists but has no claims/profile doc, call `setClaims` as an authenticated admin from the same clinic.

1. Sign in as an existing admin and get an ID token from the frontend app (or SDK).
2. Run:
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

This sets custom claims and creates/updates: `clinics/<clinicId>/users/<uid>`.

### Option B: CLI
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' \
FIREBASE_PROJECT_ID='hospital-management-syst-855b0' \
npm run seed -- "City Care" "admin@citycare.lk" "StrongPass123!" "Main Admin"
```

## Important security notes
- Firebase web config is public by design.
- Security is enforced by Firestore/Storage rules and custom claims.
- Never commit service account JSON.
- Privileged operations must run in Netlify Functions using Firebase Admin SDK.
