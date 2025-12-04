'use client';

import { useState, useEffect } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
  itemType?: string;
}

export function Pagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
  itemType = 'items',
}: PaginationProps) {
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNumber = parseInt(pageInput, 10);
      if (!isNaN(pageNumber)) onPageChange(pageNumber);
    }
  };

  const handleBlur = () => {
    const pageNumber = parseInt(pageInput, 10);
    if (!isNaN(pageNumber)) {
      onPageChange(pageNumber);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg px-4 py-2">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">Rows per page:</span>
        <select value={itemsPerPage} onChange={(e) => onItemsPerPageChange(Number(e.target.value))} className="bg-transparent border-0 rounded-md text-sm font-medium text-gray-700 focus:ring-0">
          {[15, 25, 50, 100, 250].map(size => (<option key={size} value={size}>{size}</option>))}
        </select>
      </div>
      <div className="text-gray-300">|</div>
      <div className="text-sm text-gray-700">
        <span className="font-medium">{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>-
        <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
        <span className="font-medium">{totalItems}</span> {itemType}
      </div>
      <div className="text-gray-300">|</div>
      <div className="flex items-center space-x-1">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="p-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronsLeft size={16} />
        </button>
        <div className="flex items-center">
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-700">
            Page
            <input type="text" value={pageInput} onChange={(e) => setPageInput(e.target.value)} onKeyDown={handlePageInputSubmit} onBlur={handleBlur} className="w-10 mx-1 text-center border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
            of <span className="font-medium">{totalPages}</span>
          </span>
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}