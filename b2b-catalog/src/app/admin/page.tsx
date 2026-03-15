'use client';

import { Package, Upload, Archive, Users, MessageSquare, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Aktive Angebote', value: '12', icon: Package, href: '/admin/offers', color: 'text-green-600' },
  { label: 'Entwürfe', value: '3', icon: Upload, href: '/admin/offers', color: 'text-yellow-600' },
  { label: 'Archiviert', value: '8', icon: Archive, href: '/admin/archive', color: 'text-gray-500' },
  { label: 'Anfragen (offen)', value: '5', icon: MessageSquare, href: '/manager/inquiries', color: 'text-blue-600' },
  { label: 'Benutzer', value: '4', icon: Users, href: '/admin/users', color: 'text-purple-600' },
  { label: 'Umsatz diese Woche', value: '€12.450', icon: TrendingUp, href: '#', color: 'text-green-600' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <Icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/import"
          className="bg-[#F6B306] rounded-lg p-6 hover:bg-yellow-500 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-900 mb-2" />
          <h2 className="text-lg font-bold text-gray-900">Neues Angebot importieren</h2>
          <p className="text-sm text-gray-700 mt-1">WhatsApp Text einfügen und Bilder hochladen</p>
        </Link>
        <Link
          href="/admin/offers"
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <Package className="w-8 h-8 text-gray-400 mb-2" />
          <h2 className="text-lg font-bold text-gray-900">Angebote verwalten</h2>
          <p className="text-sm text-gray-500 mt-1">Veröffentlichen, bearbeiten, archivieren</p>
        </Link>
      </div>
    </div>
  );
}
