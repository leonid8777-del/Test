'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, Package, Archive, FolderTree, Users, LogOut } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/import', label: 'Import', icon: Upload },
  { href: '/admin/offers', label: 'Angebote', icon: Package },
  { href: '/admin/archive', label: 'Archiv', icon: Archive },
  { href: '/admin/categories', label: 'Kategorien', icon: FolderTree },
  { href: '/admin/users', label: 'Benutzer', icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-[#F6B306]">Admin</span>
          <Link href="/login" className="text-gray-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 border-b-2 whitespace-nowrap ${
                  active
                    ? 'border-[#F6B306] text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
