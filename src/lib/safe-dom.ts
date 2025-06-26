export function getScrollHeight(el?: Element | null) {
  return (el as HTMLElement | null)?.scrollHeight ?? 0;
}

export function getScrollWidth(el?: Element | null) {
  return (el as HTMLElement | null)?.scrollWidth ?? 0;
}

export function qs<T extends Element>(
  root: ParentNode | null | undefined,
  sel: string,
): T | null {
  return root ? (root.querySelector(sel) as T | null) : null;
}
