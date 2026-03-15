'use client';

import { MessageSquare, Link2, TrendingUp, Package } from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Offene Anfragen', value: '3', icon: MessageSquare, href: '/manager/inquiries' },
  { label: 'Aktive Links', value: '5', icon: Link2, href: '/manager/share-links' },
  { label: 'Angebote aktiv', value: '12', icon: Package, href: '#' },
  { label: 'Anfragen diese Woche', value: '8', icon: TrendingUp, href: '/manager/inquiries' },
];

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Willkommen zurück</h1>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <Icon className="w-5 h-5 text-gray-400 mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Letzte Anfragen</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span>Firma Schmidt GmbH</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Neu</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span>Export Trading Ltd.</span>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">In Bearbeitung</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Großhandel Meier</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Abgeschlossen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
