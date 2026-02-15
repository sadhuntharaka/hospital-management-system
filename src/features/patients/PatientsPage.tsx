import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageCard } from '@/components/ui/PageCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { createPatient, listByClinic } from '@/lib/clinicDb';

const schema = z.object({ fullName: z.string().min(2), phone: z.string().min(10), nic: z.string().min(5), patientCode: z.string().min(3) });

export const PatientsPage = () => {
  const { claims, user } = useAuthContext();
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['patients', claims?.clinicId], queryFn: () => listByClinic(claims!.clinicId, 'patients'), enabled: !!claims?.clinicId });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const filtered = useMemo(() => data.filter((p: any) => `${p.fullName} ${p.phone} ${p.nic} ${p.patientCode}`.toLowerCase().includes(search.toLowerCase())), [data, search]);

  const createMutation = useMutation({
    mutationFn: (payload: z.infer<typeof schema>) => createPatient(claims!.clinicId, user!.uid, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patients'] }); form.reset(); },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PageCard title="Patients">
        <Input placeholder="Search name / phone / NIC / code" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="mt-3 space-y-2">
          {filtered.map((p: any) => <Link className="block rounded border p-2" key={p.id} to={`/patients/${p.id}`}>{p.patientCode} - {p.fullName}</Link>)}
        </div>
      </PageCard>
      <PageCard title="Create patient">
        <form className="space-y-2" onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
          <Input placeholder="Patient code" {...form.register('patientCode')} />
          <Input placeholder="Full name" {...form.register('fullName')} />
          <Input placeholder="Phone" {...form.register('phone')} />
          <Input placeholder="NIC" {...form.register('nic')} />
          <Button type="submit">Save patient</Button>
        </form>
      </PageCard>
    </div>
  );
};
