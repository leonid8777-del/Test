import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="bg-[#F6B306] text-gray-900 rounded-2xl p-8">
          <h1 className="text-2xl font-bold">Salzmann Restwaren</h1>
          <p className="text-sm mt-2 opacity-80">Angebotskatalog</p>
        </div>

        <p className="text-sm text-gray-500">
          Dieser Katalog ist nur über direkte Share-Links zugänglich.
          <br />
          Bitte verwenden Sie den Link, den Sie von Ihrem Ansprechpartner erhalten haben.
        </p>

        <div className="space-y-3">
          <Link
            href="/catalog/demo"
            className="block w-full py-3 bg-[#F6B306] text-gray-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors"
          >
            Demo-Katalog ansehen
          </Link>
          <Link
            href="/login"
            className="block w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Manager Login
          </Link>
        </div>
      </div>
    </div>
  );
}
