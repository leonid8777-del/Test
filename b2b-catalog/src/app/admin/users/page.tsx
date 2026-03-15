'use client';

import { useState } from 'react';
import { Plus, Shield, UserCheck, User as UserIcon, Trash2, Edit3 } from 'lucide-react';

interface UserEntry {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'customer';
  phone?: string;
  created_at: string;
}

const sampleUsers: UserEntry[] = [
  { id: '1', email: 'admin@salzmann.de', full_name: 'Admin Salzmann', role: 'admin', phone: '+49 171 0000001', created_at: '2024-01-01' },
  { id: '2', email: 'max@salzmann.de', full_name: 'Max Mustermann', role: 'manager', phone: '+49 171 0000002', created_at: '2024-01-15' },
  { id: '3', email: 'anna@salzmann.de', full_name: 'Anna Weber', role: 'manager', phone: '+49 171 0000003', created_at: '2024-02-01' },
];

const roleIcons = {
  admin: Shield,
  manager: UserCheck,
  customer: UserIcon,
};

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  customer: 'bg-gray-100 text-gray-700',
};

export default function UsersPage() {
  const [users] = useState<UserEntry[]>(sampleUsers);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Benutzer</h1>
        <button className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 bg-[#F6B306] text-gray-900 rounded-lg hover:bg-yellow-500">
          <Plus className="w-4 h-4" />
          Neuer Benutzer
        </button>
      </div>

      <div className="space-y-2">
        {users.map(user => {
          const Icon = roleIcons[user.role];
          return (
            <div
              key={user.id}
              className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${roleColors[user.role]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">{user.full_name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[user.role]}`}>
                {user.role}
              </span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded hover:bg-gray-100 text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
