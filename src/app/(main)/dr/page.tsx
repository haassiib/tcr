// app/page.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import DateRangePicker from './DateRangePicker';

export default function Home() {
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });

  const handleDateRangeChange = (range: any) => {
    setDateRange(range);
    console.log('Selected date range:', range);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Advanced Date Range Picker
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enhanced with two side-by-side calendars and quick selection options
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="max-w-md mx-auto">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Date Range
                </label>
                <DateRangePicker onDateRangeChange={handleDateRangeChange} />
              </div>

              {/* Display selected range */}
              {dateRange.startDate && dateRange.endDate && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">
                    📅 Selected Date Range:
                  </h3>
                  <p className="text-blue-700 font-medium">
                    {format(dateRange.startDate, 'EEEE, MMMM d, yyyy')} 
                    <span className="mx-2">→</span>
                    {format(dateRange.endDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 Quick Selection Features
            </h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="font-medium">Today</span> - Select current day
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="font-medium">Last 7 Days</span> - Past week
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="font-medium">Week to Date</span> - Start of week to today
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="font-medium">Month to Date</span> - Start of month to today
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="font-medium">This Month</span> - Full current month
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="font-medium">Last Month</span> - Full previous month
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              💫 Calendar Features
            </h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Two months displayed side by side
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Visual range highlighting
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Month navigation arrows
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Today's date marked with border
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Hover effects and smooth transitions
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                Mobile-responsive design
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}