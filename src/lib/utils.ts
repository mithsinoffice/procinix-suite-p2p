import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Coerce any API response into an array — defends against the three shapes
// our backend may emit:
//   - bare array  `[…]`            (most master endpoints)
//   - paginated   `{ data: [], total, nextCursor }` (cursor-paginated)
//   - empty/error `null` / `undefined` / `{}` / non-array `data`
// Always returns an array so callers can `.find/.filter/.map` without
// runtime checks. This is the canonical fix for "X.find is not a function"
// crashes from useQuery results during initial load or unexpected shapes.
export function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}
