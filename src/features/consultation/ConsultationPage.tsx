import { useForm } from 'react-hook-form';
import { PageCard } from '@/components/ui/PageCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export const ConsultationPage = () => {
  const { register, handleSubmit } = useForm();
  return (
    <PageCard title="Consultation + Prescription">
      <form className="space-y-2" onSubmit={handleSubmit(() => window.print())}>
        <Input placeholder="Patient ID" {...register('patientId')} />
        <textarea className="w-full rounded border p-2" placeholder="Diagnosis and notes" {...register('notes')} />
        <Input placeholder="Prescription items (comma-separated)" {...register('prescription')} />
        <Input type="date" {...register('followUpDate')} />
        <Button type="submit">Save and print prescription</Button>
      </form>
    </PageCard>
  );
};
