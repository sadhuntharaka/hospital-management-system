import { useParams } from 'react-router-dom';
import { PageCard } from '@/components/ui/PageCard';

export const PatientProfilePage = () => {
  const { id } = useParams();
  return (
    <PageCard title="Patient profile">
      <p>Patient ID: {id}</p>
      <p>Visit and invoice history can be queried from visits/invoices collections for this patient.</p>
    </PageCard>
  );
};
