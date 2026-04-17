type ClassValue = string | number | false | null | undefined | ClassDict | ClassValue[];
type ClassDict = { [key: string]: unknown };

export function applyClass(...args: ClassValue[]): string {
  const out: string[] = [];
  for (const arg of args) {
    if (!arg) { continue; }
    if (typeof arg === 'string' || typeof arg === 'number') {
      out.push(String(arg));
    } else if (Array.isArray(arg)) {
      const nested = applyClass(...arg);
      if (nested) { out.push(nested); }
    } else if (typeof arg === 'object') {
      for (const key in arg) {
        if (arg[key]) { out.push(key); }
      }
    }
  }
  return out.join(' ');
}
