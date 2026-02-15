import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PatientIdentityBar } from '@/components/ui/PatientIdentityBar';
import { Card, CardHeader } from '@/components/ui/Card';

export const ConsultationPage = () => {
  const { register, handleSubmit } = useForm();
  return (
    <div className="space-y-4">
      <PatientIdentityBar />
      <PageHeader title="Consultation + Prescription" subtitle="Capture notes accurately and print quickly" />
      <Card>
        <CardHeader title="Consultation Form" subtitle="MVP free-text diagnosis + prescription builder" />
        <form className="space-y-2" onSubmit={handleSubmit(() => window.print())}>
          <Input placeholder="Patient ID" {...register('patientId')} />
          <textarea className="w-full rounded-md border border-slate-300 p-2" placeholder="Diagnosis and notes" {...register('notes')} />
          <Input placeholder="Prescription items (comma-separated)" {...register('prescription')} />
          <Input type="date" {...register('followUpDate')} />
          <Button type="submit">Save and print prescription</Button>
        </form>
      </Card>
    </div>
  );
};
