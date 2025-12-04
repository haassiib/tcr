'use client';

import { useState } from 'react';
import ResizableSidebar from '@/components/ui/ResizableSidebar';
import { Vendor, VendorStat, Brand } from '@prisma/client';

type VendorStatWithRelations = VendorStat & {
  vendor: Vendor & {
    brand: Brand;
  };
};

interface VendorStatViewProps {
  stat: VendorStatWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VendorStatView({ stat, isOpen, onClose }: VendorStatViewProps) {
  if (!isOpen || !stat) return null;

  const renderDetailField = (label: string, value: string | number | null | undefined) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <p className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm">
        {value !== null && value !== undefined && value !== '' ? value : 'N/A'}
      </p>
    </div>
  );

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title="Vendor Stat Details"
      footer={
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Close
          </button>
        </div>
      }
    >
      <div className="flex-grow flex flex-col overflow-hidden pt-6">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300">
            {renderDetailField('Date', new Date(stat.statDate).toLocaleDateString())}
            <div className="grid grid-cols-2 gap-x-4">
              {renderDetailField('Vendor Name', stat.vendor.name)}
              {renderDetailField('Brand Name', stat.vendor.brand.name)}
              {renderDetailField('Registrations', stat.registration)}
              {renderDetailField('FTD', stat.firstTimeDeposit)}
              {renderDetailField('Ad Expense', `$${Number(stat.adExpense).toFixed(2)}`)}
              {renderDetailField('Ads Commission', `$${Number(stat.adsCommission).toFixed(2)}`)}
              {renderDetailField('Daily Budget', `$${Number(stat.dailyBudget).toFixed(2)}`)}
              {renderDetailField('Top-up Amount', `$${Number(stat.topUpAmount).toFixed(2)}`)}
              {renderDetailField('Ad Views', stat.adsViews)}
              {renderDetailField('Ad Clicks', stat.adsClicks)}
              {renderDetailField('Ad Chargeback', `$${Number(stat.adsChargeback).toFixed(2)}`)}
              {renderDetailField('Deposit', `$${Number(stat.deposit).toFixed(2)}`)}
              {renderDetailField('Withdraw', `$${Number(stat.withdraw).toFixed(2)}`)}
            </div>
            {renderDetailField('Created At', new Date(stat.createdAt).toLocaleString())}
            {renderDetailField('Updated At', new Date(stat.updatedAt).toLocaleString())}
        </div>
      </div>
    </ResizableSidebar>
  );
}