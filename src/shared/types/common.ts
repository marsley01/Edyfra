export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimestampFields {
  createdAt: string;
  updatedAt: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export type AsyncAction<T = void> = {
  execute: (...args: unknown[]) => Promise<T>;
  loading: boolean;
  error: string | null;
};

export interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectOption extends Option {
  description?: string;
  icon?: React.ReactNode;
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface Step {
  title: string;
  description?: string;
  status: "pending" | "active" | "completed" | "error";
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county: string;
  country: string;
  postalCode?: string;
}
