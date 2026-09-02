/**
 * The backend stores timestamps as naive UTC datetimes (no timezone
 * suffix) and serializes them as-is — e.g. "2026-09-02T08:56:12.259026",
 * NOT "...259026Z". The native `Date` constructor treats a string with no
 * timezone designator as LOCAL time, not UTC, so `new Date(recordedAt)`
 * silently misinterprets every backend timestamp by the browser's own UTC
 * offset (5.5 hours for IST) — this is exactly what caused a genuinely
 * fresh sensor reading (1h44m old) to be miscalculated as 7h14m old on
 * the dashboard's staleness check, wrongly marking it "No sensor data."
 *
 * Always parse a timestamp that came from the backend through this
 * helper instead of calling `new Date(...)` on it directly.
 */
export function parseBackendUTC(isoString: string): Date {
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(isoString);
  return new Date(hasTimezone ? isoString : `${isoString}Z`);
}