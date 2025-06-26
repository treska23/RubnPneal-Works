export function safeScrollHeight(el?: Element | null) {
  return (el as HTMLElement | null)?.scrollHeight ?? 0;
}
export function safeScrollWidth(el?: Element | null) {
  return (el as HTMLElement | null)?.scrollWidth ?? 0;
}
export function safeQuery<T extends Element>(
  root: ParentNode | null | undefined,
  sel: string,
): T | null {
  return root ? (root.querySelector(sel) as T) || null : null;
}
