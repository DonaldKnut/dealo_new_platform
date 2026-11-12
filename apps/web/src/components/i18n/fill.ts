/** Puts values into `{name}` slots of a translated string. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot));
}
