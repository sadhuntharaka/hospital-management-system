# Hospital & Dispensary CRM (Sri Lanka) MVP

React + Vite + TypeScript + Tailwind frontend with Firebase Auth/Firestore/Storage and Netlify deploy support.

## Current auth mode (temporary)
The frontend now runs in **admin-only mode** to simplify sign-in:
- Email/Password login via Firebase Auth.
- Only one email is allowed into the app: `VITE_ADMIN_EMAIL`.
- Any other authenticated user is immediately signed out and shown **Not authorized**.
- No frontend role/claims/clinic checks are required for login in this mode.

## Required environment variables
### Frontend (Vite)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_ADMIN_EMAIL` (the only email allowed to access UI)
- `VITE_DEFAULT_CLINIC_ID` (optional; defaults to `default`)

### Functions (server-only)
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_PROJECT_ID`
- `BOOTSTRAP_SECRET`
- `CLINIC_DEFAULT_PASSWORD`

## Local run
```bash
cp .env.example .env
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Firebase rules deploy
```bash
firebase deploy --only firestore:rules,storage
```

## Netlify notes
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Set `VITE_ADMIN_EMAIL` in Netlify environment variables to your real admin email

## Existing utility functions
Netlify functions (`createAdmin`, `createUser`, `setClaims`, `bootstrapClinic`, etc.) remain in the repo but are not required for frontend login flow in admin-only mode.


## UI/UX design system upgrade
Reusable UI components now include:
- `Button`, `Input`, `Select`, `StatusPill`
- `Modal`, `Drawer`, `ConfirmDialog`
- `ToastProvider/useToast`
- `Skeleton`, `EmptyState`, `PageHeader`, `DataTable`, `Card`, `Toolbar`, `PatientIdentityBar`

App shell improvements:
- Responsive TopBar + SideNav
- Global search (`/` to focus)
- Command palette (`Ctrl/Cmd + K`)
- Quick `+ New` menu for core receptionist actions

Page UX upgrades:
- Patients: debounced search, duplicate detection warning, quick-edit drawer, row action menu
- Appointments: live list with standardized status pills + searchable table
- Queue/Billing/Dispense: standardized headers and faster action flows
- Dispense now includes confirmation dialog before stock deduction


Additional UX refinements:
- Command palette supports keyboard navigation (Up/Down/Enter) and grouped results.
- Appointments include status/date quick filters for daily time management.
- Patient drawer supports create + edit modes with duplicate safety callout and direct open-existing CTA.
- Dispense workflow includes required-field validation and pre-confirmation summary.

## Operations workflow test (manual, 10 steps)
1. Login with the configured admin account.
2. Open **Patients** and create a new patient with code, name, phone, and NIC.
3. Verify the new patient appears immediately in the patient list without refreshing.
4. In the patient row actions, click **Add to Queue** and confirm patient details are prefilled.
5. Select a doctor in Queue drawer, create token, and verify token + queue list update instantly.
6. From queue row actions, click **Start Consult** and confirm navigation to `/consultation?visitId=<id>`.
7. In Consultation, enter diagnosis/notes/prescription, save, then click **Close Visit**.
8. Verify the source queue item status changes to `done` automatically.
9. From Patients row actions, click **Create appointment**, fill doctor/date/time, save, and confirm appointment appears instantly.
10. From appointment row, click **Start Consult** then **Complete/Close Visit** and verify appointment status reaches `completed`.

## Finance workflow (billing + reports)
1. Go to **Billing** and ensure at least one active service exists in Firestore (`clinics/<clinicId>/services`).
2. Select patient (or enter walk-in), assign doctor, add one or more service items, set discount if needed.
3. Save invoice; invoice number is generated atomically from `clinics/<clinicId>/counters/invoices`.
4. Verify invoice appears immediately in the invoice list.
5. Open **View/Print** to print receipt from stored invoice data.
6. Use **Record Payment** to store payment method and amount in `payments`.
7. Void an issued invoice using **Void** action and reason; status updates to `void`.
8. Open **Revenue Reports** and select date range preset (Today/Week/Month/Custom).
9. Validate totals: revenue, invoice count, average invoice, doctor/service breakdowns.
10. Export CSV for invoice list, doctor totals, and service totals.

## Inventory workflow (items + purchases + dispense + expiry)
1. Open **Stock Items** and create a medicine with unit, sell price, reorder level, and active status.
2. Confirm the item appears instantly in the realtime list and on-hand starts at `0`.
3. Open **Stock Purchases**, create a purchase with supplier/date and at least one line (item, batch, expiry, unit cost, qty).
4. Post purchase and confirm purchase number is generated and batch stock increases.
5. Open item **View batches** and verify the posted batch exists with expected `qtyAvailable` and expiry.
6. Open **Dispense**, choose item + quantity, review FEFO plan, and post dispense.
7. Confirm today’s dispense list updates immediately and batch quantities decrease from earliest expiry first.
8. Void a dispense and verify stock is restored to the same batches used in `batchesUsed`.
9. Open **Expiry & Low Stock** and switch between 7/14/30/60 day filters to validate expiring-batch alerts.
10. Void a purchase (with reason); verify reversal is blocked when stock is already consumed, and succeeds only when reversible.
