import { PageCard } from '@/components/ui/PageCard';

export const AdminClinicPage = () => <PageCard title="Clinic Profile">Clinic settings and metadata.</PageCard>;
export const AdminUsersPage = () => <PageCard title="Users + Roles">Manage users and role assignment via Netlify function.</PageCard>;
export const AdminDoctorsPage = () => <PageCard title="Doctor Profiles + Schedules">Weekly templates and slot minutes.</PageCard>;
export const AdminServicesPage = () => <PageCard title="Service Catalog">Consultation and service fee settings.</PageCard>;
export const AdminAuditPage = () => <PageCard title="Audit Logs">Read-only append-only logs.</PageCard>;
