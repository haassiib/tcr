'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronsUpDown } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  emptyText = 'No options found.',
  className = '',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOptions = options.filter(option => value.includes(option.value));
  const availableOptions = options.filter(option => !value.includes(option.value) && option.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelect = (selectedValue: string) => {
    onChange([...value, selectedValue]);
    setSearchQuery('');
  };

  const handleDeselect = (deselectedValue: string) => {
    onChange(value.filter(v => v !== deselectedValue));
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map(option => (
            <span key={option.value} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-sm font-medium px-2 py-1 rounded-full">
              {option.label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeselect(option.value);
                }}
                className="text-indigo-600 hover:text-indigo-800"
              >
                <X size={14} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronsUpDown size={16} className="text-gray-400 ml-auto" />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {availableOptions.length > 0 ? (
              availableOptions.map(option => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer"
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm text-gray-500">{emptyText}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}