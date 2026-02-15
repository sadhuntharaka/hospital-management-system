import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CommandPalette } from './CommandPalette';
import { listByClinic } from '@/lib/clinicDb';
import { DEFAULT_CLINIC_ID } from '@/lib/appConfig';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/patients', label: 'Patients', icon: '🧑‍⚕️' },
  { to: '/appointments', label: 'Appointments', icon: '📅' },
  { to: '/queue', label: 'Queue', icon: '🎫' },
  { to: '/consultation', label: 'Consultation', icon: '🩺' },
  { to: '/billing', label: 'Billing', icon: '💳' },
  { to: '/pharmacy/dispense', label: 'Dispense', icon: '💊' },
  { to: '/stock/items', label: 'Items', icon: '📦' },
  { to: '/reports/revenue', label: 'Reports', icon: '📈' },
  { to: '/admin/clinic', label: 'Admin', icon: '⚙️' },
];

const quickNewItems = [
  { label: 'New Patient', to: '/patients' },
  { label: 'New Appointment', to: '/appointments' },
  { label: 'Add Queue Token', to: '/queue' },
  { label: 'New Invoice', to: '/billing' },
];

export const AppLayout = () => {
  const { logout, user } = useAuthContext();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const debouncedSearch = useDebouncedValue(globalSearch, 200);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const { data: patients = [] } = useQuery({
    queryKey: ['command-patients', DEFAULT_CLINIC_ID],
    queryFn: () => listByClinic(DEFAULT_CLINIC_ID, 'patients'),
  });

  const commands = useMemo(() => {
    const routeCommands = links.map((l) => ({ label: l.label, to: l.to }));
    const patientCommands = (patients as any[])
      .filter((patient) =>
        !debouncedSearch || `${patient.fullName || ''} ${patient.phone || ''}`.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
      .slice(0, 8)
      .map((patient) => ({ label: `Patient: ${patient.fullName || patient.id}`, to: `/patients/${patient.id}` }));
    return [...routeCommands, ...patientCommands];
  }, [patients, debouncedSearch]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === '/' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
          <button className="rounded bg-slate-100 px-2 py-1 md:hidden" onClick={() => setMobileNav((v) => !v)}>☰</button>
          <div className="flex items-center gap-2 text-brand">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white">H</div>
            <div>
              <p className="text-sm font-semibold">Hospital CRM</p>
              <p className="text-xs text-slate-500">City Care Clinic</p>
            </div>
          </div>

          <div className="ml-auto hidden max-w-md flex-1 md:block">
            <Input ref={searchRef} placeholder="Global search (/ to focus, ⌘K palette)" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
          </div>

          <details className="relative">
            <summary className="list-none">
              <Button variant="secondary">+ New</Button>
            </summary>
            <div className="absolute right-0 mt-1 min-w-44 rounded-lg border bg-white p-1 shadow-lg">
              {quickNewItems.map((item) => (
                <button key={item.label} className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100" onClick={() => navigate(item.to)}>
                  {item.label}
                </button>
              ))}
            </div>
          </details>

          <details className="relative">
            <summary className="list-none cursor-pointer rounded-md border px-3 py-2 text-sm">{user?.email || 'Admin'}</summary>
            <div className="absolute right-0 mt-1 min-w-40 rounded-lg border bg-white p-1 shadow-lg">
              <button className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100" onClick={() => logout()}>
                Logout
              </button>
            </div>
          </details>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 md:grid-cols-[240px,1fr]">
        <aside className={`rounded-xl bg-white p-3 shadow-sm ${mobileNav ? 'block' : 'hidden md:block'}`}>
          <nav className="space-y-1 text-sm">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-2 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}>
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
};
