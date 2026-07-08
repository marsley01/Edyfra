"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/shared/ui/atoms/Skeleton";
import { EmptyState } from "@/shared/ui/molecules/EmptyState";
import { Button } from "@/shared/ui/atoms/Button";
import { RefreshCw } from "lucide-react";

export interface DataListColumn<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface DataListProps<T> {
  data: T[];
  columns: DataListColumn<T>[];
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function DataList<T>({
  data,
  columns,
  loading,
  error,
  emptyTitle = "No items found",
  emptyDescription,
  emptyAction,
  onRetry,
  keyExtractor,
  className,
}: DataListProps<T>) {
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <p className="text-destructive text-sm mb-3">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4 p-4 border border-border rounded-lg">
            {columns.map((col) => (
              <div key={col.key} className={cn("flex-1", col.className)}>
                <Skeleton variant="text" width="80%" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={cn("divide-y divide-border", className)}>
      {data.map((item, index) => (
        <div
          key={keyExtractor(item)}
          className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
        >
          {columns.map((col) => (
            <div key={col.key} className={cn("flex-1 min-w-0", col.className)}>
              {col.render(item, index)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
