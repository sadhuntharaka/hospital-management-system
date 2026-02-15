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
