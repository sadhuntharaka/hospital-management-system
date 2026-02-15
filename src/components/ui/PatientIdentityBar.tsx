interface PatientIdentityBarProps {
  patientId?: string;
  patientCode?: string;
  name?: string;
  phone?: string;
  nic?: string;
  age?: string;
}

export const PatientIdentityBar = ({ patientId, patientCode, name, phone, nic, age }: PatientIdentityBarProps) => (
  <div className="sticky top-20 z-20 rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Patient Identity Check</p>
    <div className="mt-1 grid gap-1 text-sm text-slate-800 md:grid-cols-3">
      <span><b>ID/Code:</b> {patientCode || patientId || '-'}</span>
      <span><b>Name:</b> {name || '-'}</span>
      <span><b>Phone:</b> {phone || '-'}</span>
      <span><b>NIC:</b> {nic || '-'}</span>
      <span><b>Age:</b> {age || '-'}</span>
      <span className="text-amber-700"><b>Warning:</b> Verify patient before dispensing/billing.</span>
    </div>
  </div>
);
