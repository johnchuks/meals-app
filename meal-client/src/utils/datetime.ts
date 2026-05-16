export function formatIsoAsLocalDateTime(iso: string): string {
  const parsed = new Date(iso)
  return isNaN(parsed.getTime()) ? iso : parsed.toLocaleString()
}
