import { twMerge } from "tailwind-merge";

export type ClassValue = string | number | null | boolean | undefined;

export function cn(...values: ClassValue[]): string {
  return twMerge(values.filter(Boolean).join(" "));
}
