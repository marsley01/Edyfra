"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import DashboardPageContent from "./DashboardPageContent";

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardPageContent />
    </ErrorBoundary>
  );
}