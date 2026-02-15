import { useParams } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui/Card';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';

export const PatientProfilePage = () => {
  const { id } = useParams();
  return (
    <div className="space-y-4">
      <PatientIdentityBar patientId={id} />
      <Card>
        <CardHeader title="Patient Profile" subtitle="Visits, invoices, and clinical history" />
        <p className="text-sm text-slate-600">
          Visit and invoice history can be queried from visits/invoices collections for this patient.
        </p>
      </Card>
    </div>
  );
};
