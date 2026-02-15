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

const groupedLinks = [
  {
    heading: 'Operations',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
      { to: '/patients', label: 'Patients', icon: '🧑‍⚕️' },
      { to: '/appointments', label: 'Appointments', icon: '📅' },
      { to: '/queue', label: 'Queue', icon: '🎫' },
      { to: '/consultation', label: 'Consultation', icon: '🩺' },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { to: '/billing', label: 'Billing', icon: '💳' },
      { to: '/reports/revenue', label: 'Reports', icon: '📈' },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      { to: '/pharmacy/dispense', label: 'Dispense', icon: '💊' },
      { to: '/stock/items', label: 'Items', icon: '📦' },
      { to: '/stock/purchases', label: 'Purchases', icon: '🧾' },
      { to: '/stock/expiry', label: 'Expiry', icon: '⏰' },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { to: '/admin/clinic', label: 'Clinic', icon: '⚙️' },
      { to: '/admin/users', label: 'Users', icon: '👥' },
      { to: '/admin/doctors', label: 'Doctors', icon: '🧑‍⚕️' },
      { to: '/admin/services', label: 'Services', icon: '🧩' },
      { to: '/admin/audit', label: 'Audit', icon: '🕵️' },
    ],
  },
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
  const [quickOpen, setQuickOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(globalSearch, 200);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const { data: patients = [] } = useQuery({
    queryKey: ['command-patients', DEFAULT_CLINIC_ID],
    queryFn: () => listByClinic(DEFAULT_CLINIC_ID, 'patients'),
  });

  const commands = useMemo(() => {
    const routeCommands = groupedLinks.flatMap((group) =>
      group.items.map((item) => ({ label: item.label, to: item.to })),
    );
    const patientCommands = (patients as any[])
      .filter(
        (patient) =>
          !debouncedSearch ||
          `${patient.fullName || ''} ${patient.phone || ''}`
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()),
      )
      .slice(0, 8)
      .map((patient) => ({
        label: `Patient: ${patient.fullName || patient.id}`,
        to: `/patients/${patient.id}`,
      }));
    return [...routeCommands, ...patientCommands];
  }, [patients, debouncedSearch]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (
        event.key === '/' &&
        !(event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setQuickOpen(false);
        setUserMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
          <button
            className="rounded bg-slate-100 px-2 py-1 md:hidden"
            onClick={() => setMobileNav((v) => !v)}
          >
            ☰
          </button>
          <div className="flex items-center gap-2 text-brand">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white">
              H
            </div>
            <div>
              <p className="text-sm font-semibold">Hospital CRM</p>
              <p className="text-xs text-slate-500">City Care Medical Center</p>
            </div>
          </div>

          <div className="ml-auto hidden max-w-md flex-1 md:block">
            <Input
              ref={searchRef}
              placeholder="Global search (/ to focus, ⌘K palette)"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <Button variant="secondary" onClick={() => setQuickOpen((v) => !v)}>
              + New
            </Button>
            {quickOpen && (
              <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-lg border bg-white p-1 shadow-lg">
                {quickNewItems.map((item) => (
                  <button
                    key={item.label}
                    className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100"
                    onClick={() => {
                      navigate(item.to);
                      setQuickOpen(false);
                      setMobileNav(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              {user?.email || 'Admin'}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 z-20 mt-1 min-w-40 rounded-lg border bg-white p-1 shadow-lg">
                <button
                  className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100"
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 md:grid-cols-[260px,1fr]">
        <aside
          className={`rounded-xl bg-white p-3 shadow-sm ${mobileNav ? 'block' : 'hidden md:block'}`}
        >
          <nav className="space-y-3 text-sm">
            {groupedLinks.map((group) => (
              <div key={group.heading}>
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.heading}
                </p>
                <div className="space-y-1">
                  {group.items.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-md px-3 py-2 ${
                          isActive
                            ? 'bg-brand text-white shadow-sm'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`
                      }
                      onClick={() => setMobileNav(false)}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">
          <Outlet />
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
};
