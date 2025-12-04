'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

interface AutocompleteDropdownOption {
  value: string;
  label: string;
}

interface AutocompleteDropdownProps {
  options: AutocompleteDropdownOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
  disabled?: boolean;
}

export function AutocompleteDropdown({ options, value, onChange, placeholder, searchPlaceholder, emptyText, className, disabled = false }: AutocompleteDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [position, setPosition] = React.useState<'top' | 'bottom'>('bottom');
  
  const filteredOptions =
    query === ''
      ? options
      : options.filter(option =>
          option.label.toLowerCase().includes(query.toLowerCase())
        );

  const selectedLabel = options.find(option => option.value === value)?.label;

  const dropdownRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.parentElement?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleOpen = () => {
    if (disabled) return;
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Estimate dropdown height (max-h-60 is 15rem/240px + padding/input)
      if (spaceBelow < 280) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
    setOpen(!open);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={dropdownRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="open menu"
        type="button"
        onClick={handleOpen}        
        className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        disabled={disabled}
      >
        <span className="block truncate">{selectedLabel || placeholder}</span>
      </button>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>

      {open && (
        <div className={`absolute z-50 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-gray-100 ring-opacity-5 focus:outline-none sm:text-sm
          ${position === 'bottom' ? 'mt-1' : 'bottom-full mb-1'}
        `}
        style={{ maxHeight: '15rem' }} // Equivalent to max-h-60
        >
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
          {filteredOptions.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">{emptyText}</div>
          ) : (
            filteredOptions.map(option => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value === value ? null : option.value);
                  setOpen(false);
                  setQuery('');
                }}
                className="relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 hover:bg-indigo-600 hover:text-white"
              >
                <span className="block truncate">{option.label}</span>
                {value === option.value && <Check className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}