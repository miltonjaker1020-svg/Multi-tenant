'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UserRound, LogOut, Building2, ChevronLeft } from 'lucide-react';

const navigation = [
  { name: 'Agenda', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pacientes', href: '/dashboard/pacientes', icon: Users },
  { name: 'Médicos', href: '/dashboard/medicos', icon: UserRound },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-20'}`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <span className={sidebarOpen ? 'text-xl font-bold text-blue-600' : 'hidden'}>MediTenant AI</span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                } ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className={sidebarOpen ? 'flex items-center gap-3 px-3 py-2 text-sm text-gray-600' : 'hidden'}>
            <Building2 className="w-5 h-5 text-gray-400" />
            <span>Clínica Demo</span>
          </div>
          <Link
            href="/api/auth/logout"
            className={sidebarOpen ? 'flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg' : 'flex justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg'}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Cerrar sesión</span>}
          </Link>
        </div>
      </aside>

      <div className={`lg:pl-64 transition-all duration-200 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}>
        <header className="sticky top-0 z-40 bg-white border-b px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Panel de control</h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}