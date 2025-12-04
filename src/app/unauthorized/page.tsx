'use client';

import { ShieldAlert, Home } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      <div className="max-w-md w-full">
        <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100">
          <ShieldAlert className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="mt-6 text-4xl font-extrabold text-gray-900 tracking-tight">
          Access Denied
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          You do not have the necessary permissions to view this page.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          If you believe this is an error, please contact your system administrator.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <Home className="mr-2 -ml-1 h-5 w-5" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

