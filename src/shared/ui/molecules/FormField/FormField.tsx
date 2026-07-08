"use client";

import type { ReactNode } from "react";
import { Input, type InputProps } from "@/shared/ui/atoms/Input";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends InputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  helper?: ReactNode;
}

export function FormField({ label, error, hint, required, helper, className, ...inputProps }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputProps.id || label.toLowerCase().replace(/\s+/g, "-")}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        {helper && <span className="text-xs text-muted-foreground">{helper}</span>}
      </div>
      <Input
        {...inputProps}
        id={inputProps.id || label.toLowerCase().replace(/\s+/g, "-")}
        error={error}
        hint={hint}
      />
    </div>
  );
}
