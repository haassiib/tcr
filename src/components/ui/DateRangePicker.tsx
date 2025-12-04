// components/DateRangePicker.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  isBefore, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  startOfDay,
  endOfDay,
  subDays,
  startOfYear,
  endOfYear,
  startOfWeek as weekStart,
  endOfWeek as weekEnd,
  subMonths as subtractMonths
} from 'date-fns';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  onDateRangeChange: (range: DateRange) => void;
  initialRange?: DateRange;
  className?: string;
}

type QuickOption = 'today' | 'last7days' | 'weekToDate' | 'monthToDate' | 'thisMonth' | 'lastMonth';

export default function DateRangePicker({ onDateRangeChange, initialRange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [leftMonth, setLeftMonth] = useState(initialRange?.startDate || new Date());
  const [dateRange, setDateRange] = useState<DateRange>(initialRange || { startDate: null, endDate: null });
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialRange) {
      setDateRange(initialRange);
      setLeftMonth(initialRange.startDate || new Date());
    }
  }, [initialRange]);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rightMonth = addMonths(leftMonth, 1);

  const generateCalendarDays = (month: Date) => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(month)),
      end: endOfWeek(endOfMonth(month))
    });
  };

  const leftDays = generateCalendarDays(leftMonth);
  const rightDays = generateCalendarDays(rightMonth);

  const handleDateClick = (date: Date) => {
    if (!dateRange.startDate || (dateRange.startDate && dateRange.endDate)) {
      // Start new selection
      const newRange = { startDate: date, endDate: null };
      setDateRange(newRange);
      setTempEndDate(null);
    } else if (dateRange.startDate && !dateRange.endDate) {
      // Complete the selection
      let start = dateRange.startDate;
      let end = date;
      
      // Ensure start is before end
      if (isBefore(end, start)) {
        [start, end] = [end, start];
      }
      
      const newRange = { startDate: start, endDate: end };
      setDateRange(newRange);
      setTempEndDate(null);
    }
  };

  const handleMouseEnter = (date: Date) => {
    if (dateRange.startDate && !dateRange.endDate) {
      setTempEndDate(date);
    }
  };

  const isInRange = (date: Date) => {
    if (!dateRange.startDate) return false;
    
    const start = dateRange.startDate;
    const end = tempEndDate || dateRange.endDate;
    
    if (!end) return false;
    
    const actualStart = isBefore(start, end) ? start : end;
    const actualEnd = isBefore(start, end) ? end : start;
    
    return date >= actualStart && date <= actualEnd && !isSameDay(date, actualStart) && !isSameDay(date, actualEnd);
  };

  const isRangeStart = (date: Date) => {
    if (!dateRange.startDate) return false;
    
    const start = dateRange.startDate;
    const end = tempEndDate || dateRange.endDate;
    
    if (!end) return isSameDay(date, start);
    
    const actualStart = isBefore(start, end) ? start : end;
    return isSameDay(date, actualStart);
  };

  const isRangeEnd = (date: Date) => {
    if (!dateRange.startDate || (!dateRange.endDate && !tempEndDate)) return false;
    
    const start = dateRange.startDate;
    const end = tempEndDate || dateRange.endDate;
    
    if (!end) return false;
    
    const actualEnd = isBefore(start, end) ? end : start;
    return isSameDay(date, actualEnd);
  };

  const navigateMonths = (direction: 'prev' | 'next') => {
    setLeftMonth(current => 
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    );
  };

  const handleQuickSelect = (option: QuickOption) => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (option) {
      case 'today':
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case 'last7days':
        startDate = startOfDay(subDays(today, 6));
        endDate = endOfDay(today);
        break;
      case 'weekToDate':
        startDate = startOfDay(weekStart(today, { weekStartsOn: 0 }));
        endDate = endOfDay(today);
        break;
      case 'monthToDate':
        startDate = startOfMonth(today);
        endDate = endOfDay(today);
        break;
      case 'thisMonth':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = subtractMonths(today, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      default:
        return;
    }

    const newRange = { startDate, endDate };
    setDateRange(newRange);
  };

  const handleApply = () => {
    onDateRangeChange(dateRange);
    setIsOpen(false);
  };

  const formatDisplayDate = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return `${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`;
    } else if (dateRange.startDate) {
      return `${format(dateRange.startDate, 'MMM d, yyyy')} - Select end date`;
    }
    return 'Select date range';
  };

  const Calendar = ({ days, month }: { days: Date[]; month: Date }) => (
    <div className="w-full">
      {/* Month Header */}
      <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
        {format(month, 'MMMM yyyy')}
      </h3>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const isCurrentMonth = isSameMonth(day, month);
          const isSelectedStart = isRangeStart(day);
          const isSelectedEnd = isRangeEnd(day);
          const isInSelectedRange = isInRange(day);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              onMouseEnter={() => handleMouseEnter(day)}
              className={`
                h-8 text-sm rounded transition-all duration-200 flex items-center justify-center
                ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}
                ${isToday && !isSelectedStart && !isSelectedEnd ? 'border border-blue-500 font-semibold' : ''}
                ${isSelectedStart || isSelectedEnd ? 'bg-blue-600 text-white font-semibold' : ''}
                ${isInSelectedRange ? 'bg-blue-100 text-blue-800' : ''}
                ${isCurrentMonth && !isSelectedStart && !isSelectedEnd && !isInSelectedRange ? 'hover:bg-gray-100' : ''}
                ${!isCurrentMonth ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={!isCurrentMonth}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );

  const quickOptions = [
    { key: 'today' as QuickOption, label: 'Today' },
    { key: 'last7days' as QuickOption, label: 'Last 7 Days' },
    { key: 'weekToDate' as QuickOption, label: 'Week to Date' },
    { key: 'monthToDate' as QuickOption, label: 'Month to Date' },
    { key: 'thisMonth' as QuickOption, label: 'This Month' },
    { key: 'lastMonth' as QuickOption, label: 'Last Month' },
  ];

  return (
    <div className={`relative ${className}`} ref={popupRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-700">{formatDisplayDate()}</span>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </button>

      {/* Popup Calendar */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-6 min-w-[800px]">
          <div className="flex gap-8">
            {/* Quick Selection Panel */}
            <div className="w-48 flex-shrink-0">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Selection</h4>
              <div className="space-y-2">
                {quickOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={() => handleQuickSelect(option.key)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Selected Dates Display */}
              {(dateRange.startDate || dateRange.endDate) && (
                <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                  <h5 className="text-xs font-medium text-gray-500 mb-1">Selected Range</h5>
                  <div className="text-sm text-gray-800">
                    {dateRange.startDate && format(dateRange.startDate, 'MMM d, yyyy')}
                    {dateRange.endDate && ` - ${format(dateRange.endDate, 'MMM d, yyyy')}`}
                  </div>
                </div>
              )}
            </div>

            {/* Calendars */}
            <div className="flex-1">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateMonths('prev')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex gap-2">
                  <span className="text-lg font-semibold text-gray-800">
                    {format(leftMonth, 'MMMM yyyy')}
                  </span>
                  <span className="text-lg text-gray-400">→</span>
                  <span className="text-lg font-semibold text-gray-800">
                    {format(rightMonth, 'MMMM yyyy')}
                  </span>
                </div>
                
                <button
                  onClick={() => navigateMonths('next')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Two Calendars Side by Side */}
              <div className="flex gap-8">
                <Calendar days={leftDays} month={leftMonth} />
                <Calendar days={rightDays} month={rightMonth} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                setDateRange({ startDate: null, endDate: null });
                setTempEndDate(null);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Selection
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!dateRange.startDate || !dateRange.endDate}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}