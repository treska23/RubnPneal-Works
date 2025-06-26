import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeScrollHeight(el?: HTMLElement | null) {
  return el?.scrollHeight ?? 0;
}

export function safeScrollWidth(el?: HTMLElement | null) {
  return el?.scrollWidth ?? 0;
}

export function safeQuery<T extends Element>(
  root: ParentNode | null | undefined,
  sel: string,
): T | null {
  return root ? (root.querySelector(sel) as T) || null : null;
}
