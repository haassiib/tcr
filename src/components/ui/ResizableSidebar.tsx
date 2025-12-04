'use client';

import { useState, useRef, useCallback, ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ResizableSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  initialWidth?: number;
}

export default function ResizableSidebar({ isOpen, onClose, title, children, footer, initialWidth = 420 }: ResizableSidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const isResizing = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setSidebarWidth(initialWidth);
    }
  }, [isOpen, initialWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 320 && newWidth < window.innerWidth * 0.8) {
      setSidebarWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full bg-white shadow-2xl flex flex-col p-8"
        onClick={e => e.stopPropagation()}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div onMouseDown={handleMouseDown} className="absolute left-0 top-0 h-full w-2 cursor-col-resize" />
        <div className="flex justify-between items-center pb-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><X className="w-6 h-6" /></button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}