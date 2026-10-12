import React from "react";
import "./Pagination.css";

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalItems, pageSize, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) return null;

    return (
        <div className="pagination-shell" role="navigation" aria-label="Pagination">
            {/* Small screen: just prev/next + page indicator */}
            <div className="flex items-center justify-between w-full sm:hidden">
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="pagination-button">
                    ‹ Prev
                </button>
                <span className="text-sm text-gray-400">
                    {currentPage} / {totalPages}
                </span>
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-button">
                    Next ›
                </button>
            </div>

            {/* Large screen: full pagination */}
            <span className="hidden sm:block text-sm text-gray-400">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
            </span>
            <div className="hidden sm:flex items-center gap-1">
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="pagination-button">
                    ‹ Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        type="button"
                        key={page}
                        onClick={() => onPageChange(page)}
                        aria-label={`Page ${page}`}
                        aria-current={page === currentPage ? "page" : undefined}
                        className="pagination-button"
                    >
                        {page}
                    </button>
                ))}
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-button">
                    Next ›
                </button>
            </div>
        </div>
    );
};
