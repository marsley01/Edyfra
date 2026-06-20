"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const scriptProps = typeof window !== "undefined" ? { type: "application/json" } : undefined;

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props} scriptProps={scriptProps}>
      {children}
    </NextThemesProvider>
  );
}
