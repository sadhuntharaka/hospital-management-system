import { useParams } from 'react-router-dom';
import { PageCard } from '@/components/ui/PageCard';

export const PatientProfilePage = () => {
  const { id } = useParams();
  return (
    <div className="space-y-4">
      <div className="sticky top-20 z-20 rounded-lg border bg-white p-3 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Patient Identity</p>
        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium">Patient ID: {id}</span>
          <span>Verify name / phone / NIC before consultation or billing.</span>
        </div>
      </div>
      <PageCard title="Patient profile">
        <p>Visit and invoice history can be queried from visits/invoices collections for this patient.</p>
      </PageCard>
    </div>
  );
};
