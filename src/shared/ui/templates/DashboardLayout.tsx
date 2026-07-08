"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sidebar, type SidebarItem } from "@/shared/ui/organisms/Sidebar";
import { Header, type NavItem } from "@/shared/ui/organisms/Header";

export interface DashboardLayoutProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  navItems?: NavItem[];
  headerActions?: React.ReactNode;
  headerLogo?: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  children,
  sidebarItems,
  navItems,
  headerActions,
  headerLogo,
  className,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar items={sidebarItems} header={headerLogo} collapsible />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header navItems={navItems} actions={headerActions} className="relative" />

        <main
          className={cn("flex-1 overflow-y-auto p-4 md:p-6 lg:p-8", className)}
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
