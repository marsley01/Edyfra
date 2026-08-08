"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/atoms/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: number;
  children?: SidebarItem[];
}

export interface SidebarProps {
  items: SidebarItem[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  collapsible?: boolean;
  className?: string;
}

export function Sidebar({ items, header, footer, collapsible = true, className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64",
        className,
      )}
      aria-label="Sidebar navigation"
    >
      {header && (
        <div className={cn("p-4 border-b border-border", collapsed && "p-3")}>
          {header}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {footer && (
        <div className={cn("p-4 border-t border-border", collapsed && "p-3")}>
          {footer}
        </div>
      )}

      {collapsible && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute -right-3 top-1/2 rounded-full border border-border bg-background shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      )}
    </aside>
  );
}

function SidebarLink({ item, collapsed }: { item: SidebarItem; collapsed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          item.active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
        title={collapsed ? item.label : undefined}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span className="flex-shrink-0 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </>
        )}
      </Link>
      {hasChildren && expanded && !collapsed && (
        <div className="ml-4 mt-1 space-y-1">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors",
                child.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
