import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { PatientsPage } from '@/features/patients/PatientsPage';
import { PatientProfilePage } from '@/features/patients/PatientProfilePage';
import { AppointmentsPage } from '@/features/appointments/AppointmentsPage';
import { QueuePage } from '@/features/appointments/QueuePage';
import { ConsultationPage } from '@/features/consultation/ConsultationPage';
import { BillingPage } from '@/features/billing/BillingPage';
import { DispensePage } from '@/features/pharmacy/DispensePage';
import { StockItemsPage, StockPurchasesPage, StockExpiryPage } from '@/features/stock/StockPages';
import { RevenueReportsPage } from '@/features/reports/RevenueReportsPage';
import { AdminClinicPage, AdminUsersPage, AdminDoctorsPage, AdminServicesPage, AdminAuditPage } from '@/features/admin/AdminPages';

const withProvider = (element: JSX.Element) => <AuthProvider>{element}</AuthProvider>;

export const router = createBrowserRouter([
  { path: '/login', element: withProvider(<LoginPage />) },
  {
    path: '/',
    element: withProvider(<ProtectedRoute />),
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'patients', element: <PatientsPage /> },
          { path: 'patients/:id', element: <PatientProfilePage /> },
          { path: 'appointments', element: <AppointmentsPage /> },
          { path: 'queue', element: <QueuePage /> },
          { path: 'consultation', element: <ConsultationPage /> },
          { path: 'billing', element: <BillingPage /> },
          { path: 'pharmacy/dispense', element: <DispensePage /> },
          { path: 'stock/items', element: <StockItemsPage /> },
          { path: 'stock/purchases', element: <StockPurchasesPage /> },
          { path: 'stock/expiry', element: <StockExpiryPage /> },
          { path: 'reports/revenue', element: <RevenueReportsPage /> },
          { path: 'admin/clinic', element: <AdminClinicPage /> },
          { path: 'admin/users', element: <AdminUsersPage /> },
          { path: 'admin/doctors', element: <AdminDoctorsPage /> },
          { path: 'admin/services', element: <AdminServicesPage /> },
          { path: 'admin/audit', element: <AdminAuditPage /> },
        ],
      },
    ],
  },
]);
