export function getNextObjectKey(obj: Record<string, unknown>): string {
  const base = "newKey";
  let key = base;
  let i = 1;
  while (Object.prototype.hasOwnProperty.call(obj, key)) {
    key = `${base}${i}`;
    i += 1;
  }
  return key;
}
