'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Demo mode: use window.location to bypass any middleware redirect loops
    if (email.startsWith('admin')) {
      window.location.href = '/admin';
    } else {
      window.location.href = '/manager';
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-block bg-[#F6B306] rounded-xl px-6 py-3 mb-4">
            <h1 className="text-xl font-bold text-gray-900">Angebotskatalog</h1>
          </div>
          <p className="text-sm text-gray-500">Manager & Admin Login</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="manager@salzmann.de"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#F6B306] text-gray-900 font-medium py-2.5 rounded-lg hover:bg-yellow-500 disabled:opacity-50 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Laden...' : 'Anmelden'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Demo: &quot;admin@...&quot; → Admin, andere → Manager
          </p>
        </form>
      </div>
    </div>
  );
}
