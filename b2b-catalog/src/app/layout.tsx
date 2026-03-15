import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Angebotskatalog – Salzmann Restwaren',
  description: 'B2B Angebotskatalog für Restposten und Sonderposten',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
