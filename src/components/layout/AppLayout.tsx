import { NavLink, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/Button';

const links = [
  '/dashboard','/patients','/appointments','/queue','/consultation','/billing','/pharmacy/dispense','/stock/items','/stock/purchases','/stock/expiry','/reports/revenue','/admin/clinic','/admin/users','/admin/doctors','/admin/services','/admin/audit',
];

export const AppLayout = () => {
  const { logout, claims } = useAuthContext();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="no-print flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <div className="font-semibold">Hospital CRM ({claims?.role || 'user'})</div>
        <Button onClick={() => logout()}>Logout</Button>
      </header>
      <div className="grid grid-cols-[220px,1fr] gap-4 p-4">
        <aside className="no-print rounded bg-white p-3 shadow-sm">
          <nav className="space-y-1 text-sm">
            {links.map((to) => (
              <NavLink key={to} to={to} className={({ isActive }) => `block rounded px-2 py-1 ${isActive ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}>
                {to.replace('/', '') || 'dashboard'}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
