import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';

const placeholderUsers = [{ id: '1', name: 'Admin User', role: 'admin', status: 'active' }];
const placeholderServices = [{ id: '1', name: 'General Consultation', fee: '3000' }];
const placeholderAudit = [{ id: '1', action: 'User login', actor: 'admin', time: 'Today 09:30' }];

export const AdminClinicPage = () => (
  <div className="space-y-4">
    <PageHeader title="Clinic Profile" subtitle="Manage clinic identity and contact settings" actions={<Button variant="secondary">Edit profile</Button>} />
    <Card>
      <CardHeader title="Clinic Information" subtitle="These fields will connect to Firestore settings." />
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p><b>Name:</b> City Care Medical Center</p>
        <p><b>Contact:</b> +94 11 234 5678</p>
        <p><b>Email:</b> info@citycare.lk</p>
        <p><b>Address:</b> Colombo, Sri Lanka</p>
      </div>
    </Card>
  </div>
);

export const AdminUsersPage = () => (
  <div className="space-y-4">
    <PageHeader title="Users + Roles" subtitle="Manage access and onboarding" actions={<Button>Invite user</Button>} />
    <Card>
      <CardHeader title="Current users" subtitle="Role management scaffold" />
      <DataTable
        rows={placeholderUsers}
        columns={[
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'role', header: 'Role', render: (row) => row.role },
          { key: 'status', header: 'Status', render: (row) => row.status },
        ]}
      />
    </Card>
  </div>
);

export const AdminDoctorsPage = () => (
  <div className="space-y-4">
    <PageHeader title="Doctor Profiles + Schedules" subtitle="Template-based weekly schedules" actions={<Button>Add doctor</Button>} />
    <Card>
      <CardHeader title="Schedule template" subtitle="Coming soon with slot-length editor." />
      <p className="text-sm text-slate-600">Use this section to configure doctor availability and session slots.</p>
    </Card>
  </div>
);

export const AdminServicesPage = () => (
  <div className="space-y-4">
    <PageHeader title="Service Catalog" subtitle="Consultation and service fee management" actions={<Button>Add service</Button>} />
    <Card>
      <CardHeader title="Services" subtitle="Pricing scaffold" />
      <DataTable
        rows={placeholderServices}
        columns={[
          { key: 'name', header: 'Service', render: (row) => row.name },
          { key: 'fee', header: 'Fee', render: (row) => `LKR ${row.fee}` },
        ]}
      />
    </Card>
  </div>
);

export const AdminAuditPage = () => (
  <div className="space-y-4">
    <PageHeader title="Audit Logs" subtitle="Operational traceability" />
    <Card>
      <CardHeader title="Recent events" subtitle="Append-only activity stream" />
      <DataTable
        rows={placeholderAudit}
        columns={[
          { key: 'action', header: 'Action', render: (row) => row.action },
          { key: 'actor', header: 'Actor', render: (row) => row.actor },
          { key: 'time', header: 'Time', render: (row) => row.time },
        ]}
      />
    </Card>
  </div>
);
