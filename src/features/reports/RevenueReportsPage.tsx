import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';

export const RevenueReportsPage = () => (
  <div className="space-y-4">
    <PageHeader title="Revenue Reports" subtitle="Daily and doctor-wise earnings overview" />
    <Card>
      <CardHeader title="Filters" subtitle="Refine report output" />
      <Toolbar
        left={
          <>
            <Input type="date" />
            <Input type="date" />
            <Input placeholder="Doctor ID" />
          </>
        }
        right={<Button>Run report</Button>}
      />
    </Card>

    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader title="Daily revenue" subtitle="Card-based summary" />
        <p className="text-2xl font-semibold">LKR 125,000</p>
      </Card>
      <Card>
        <CardHeader title="Doctor-wise totals" subtitle="Top performers" />
        <ul className="list-disc pl-5 text-sm text-slate-700">
          <li>Dr. Perera - LKR 45,000</li>
          <li>Dr. Silva - LKR 38,000</li>
        </ul>
      </Card>
    </div>
  </div>
);
