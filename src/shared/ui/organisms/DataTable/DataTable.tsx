"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/shared/ui/atoms/Skeleton";
import { Pagination } from "@/shared/ui/molecules/Pagination";
import { EmptyState } from "@/shared/ui/molecules/EmptyState";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import { Input } from "@/shared/ui/atoms/Input";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  className?: string;
  width?: string;
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  keyExtractor: (item: T) => string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading,
  error,
  onRetry,
  keyExtractor,
  page,
  totalPages,
  onPageChange,
  searchable = false,
  searchPlaceholder = "Search...",
  emptyTitle = "No results found",
  emptyDescription,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    const query = searchQuery.toLowerCase();
    const searchableColumns = columns.filter((c) => c.searchable !== false);

    return data.filter((item) =>
      searchableColumns.some((col) => {
        const value = item[col.key];
        return String(value).toLowerCase().includes(query);
      }),
    );
  }, [data, searchQuery, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = typeof aVal === "number" ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <p className="text-destructive text-sm mb-3">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton variant="rectangular" height={40} />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} variant="rectangular" height={48} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label="Search table"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                    col.hideOnMobile && "hidden md:table-cell",
                    col.className,
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                  aria-sort={
                    sortKey === col.key
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex flex-col">
                        {sortKey === col.key ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                )}
                onClick={() => onRowClick?.(item)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onRowClick(item);
                  }
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm",
                      col.hideOnMobile && "hidden md:table-cell",
                      col.className,
                    )}
                  >
                    {col.render ? col.render(item, index) : String(item[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedData.length === 0 && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription || (searchQuery ? "Try a different search term." : undefined)}
        />
      )}

      {page !== undefined && totalPages !== undefined && onPageChange && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}
