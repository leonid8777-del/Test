'use client';

import { Mail, Phone, Building2, Clock } from 'lucide-react';
import type { Inquiry, InquiryItem, Offer } from '@/types/database';

interface InquiryWithItems extends Inquiry {
  items: (InquiryItem & { offer?: Offer })[];
}

interface InquiryListProps {
  inquiries: InquiryWithItems[];
  onStatusChange?: (id: string, status: Inquiry['status']) => void;
}

const statusLabels: Record<Inquiry['status'], string> = {
  new: 'Neu',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
};

const statusColors: Record<Inquiry['status'], string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function InquiryList({ inquiries, onStatusChange }: InquiryListProps) {
  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Keine Anfragen vorhanden.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inquiries.map(inq => (
        <div key={inq.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{inq.customer_name}</h3>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {inq.customer_company}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {inq.customer_email}
                </span>
                {inq.customer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {inq.customer_phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={inq.status}
                onChange={e => onStatusChange?.(inq.id, e.target.value as Inquiry['status'])}
                className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${statusColors[inq.status]}`}
              >
                {Object.entries(statusLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {inq.message && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{inq.message}</p>
          )}

          <div className="space-y-1">
            {inq.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.offer?.title || 'Angebot'}</span>
                <span className="text-gray-500">
                  {item.requested_quantity} {item.unit} × {item.price_per_unit.toFixed(2)} EUR
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {new Date(inq.created_at).toLocaleString('de-DE')}
          </div>
        </div>
      ))}
    </div>
  );
}
