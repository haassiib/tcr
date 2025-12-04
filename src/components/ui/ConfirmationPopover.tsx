'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
interface ConfirmationPopoverProps {
  onConfirm: () => void;
  children: React.ReactNode; // This will be the trigger button
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

export default function ConfirmationPopover({
  onConfirm,
  children,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
}: ConfirmationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const confirmButtonClasses = {
    default: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {children}
      </div>

      <div
        className={`absolute z-20 top-0 right-full mr-2 w-screen max-w-xs sm:max-w-sm origin-top-left transition-all duration-200 ease-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        <div className="overflow-hidden rounded-lg shadow-lg border border-gray-300">
          <div className="relative bg-white p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0"><AlertTriangle className={`h-5 w-5 ${variant === 'destructive' ? 'text-red-500' : 'text-indigo-500'}`} /></div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button type="button" onClick={() => setIsOpen(false)} className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"> {cancelText} </button>
              <button type="button" onClick={() => { onConfirm(); setIsOpen(false); }} className={`inline-flex justify-center rounded-md border border-transparent px-3 py-1.5 text-xs font-medium shadow-sm ${confirmButtonClasses[variant]}`}> {confirmText} </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}