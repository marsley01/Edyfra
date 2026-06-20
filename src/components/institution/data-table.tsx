"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataTable<T>({
  columns,
  rows,
  empty,
  rowKey,
  onRowClick,
  className,
}: {
  columns: { key: string; header: ReactNode; align?: "left" | "right" | "center"; className?: string; render?: (row: T) => ReactNode }[];
  rows: T[];
  empty?: ReactNode;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
        {empty ?? <p className="text-sm text-gray-500">No records yet.</p>}
      </div>
    );
  }
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-gray-200 bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-gray-50 transition-colors last:border-b-0",
                  onRowClick && "cursor-pointer hover:bg-indigo-50/40",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-5 py-3 align-middle",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                  >
                    {c.render ? c.render(row) : (row as Record<string, ReactNode>)[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
