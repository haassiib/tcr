'use client';

import { useState } from 'react';
import { LoginHistory, User, LoginStatus } from '@prisma/client';
import { Search, CheckCircle, XCircle } from 'lucide-react';

type HistoryWithUser = LoginHistory & {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

interface LoginHistoryClientPageProps {
  history: HistoryWithUser[];
}

export default function LoginHistoryClientPage({ history }: LoginHistoryClientPageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter(item => {
    const userName = `${item.user.firstName || ''} ${item.user.lastName || ''}`.toLowerCase();
    const userEmail = item.user.email.toLowerCase();
    const ipAddress = item.ipAddress?.toLowerCase() || '';

    return (
      userName.includes(searchQuery.toLowerCase()) ||
      userEmail.includes(searchQuery.toLowerCase()) ||
      ipAddress.includes(searchQuery.toLowerCase())
    );
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Login History</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by user name, email, or IP..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-1/3 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">User Agent</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredHistory.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-2 whitespace-nowrap">
                  <div className="flex items-center">
                    <img className="h-10 w-10 rounded-full" src={item.user.avatarUrl || '/images/avatars/default.png'} alt="" />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{item.user.firstName} {item.user.lastName}</div>
                      <div className="text-sm text-gray-500">{item.user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-2 whitespace-nowrap">
                  {item.status === LoginStatus.success ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Failed
                    </span>
                  )}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">{item.ipAddress}</td>
                <td className="px-6 py-2">
                  <div className="text-sm text-gray-600 truncate" style={{ maxWidth: '250px' }} title={item.userAgent || ''}>
                    {item.userAgent}
                  </div>
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">{formatDate(item.loginAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}