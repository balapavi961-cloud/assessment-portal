/**
 * datetime-local inputs use the user's local timezone (no offset in the value).
 * MongoDB/API store UTC. These helpers convert between them correctly.
 */

const pad = (n) => String(n).padStart(2, '0');

/**
 * UTC ISO string → value for <input type="datetime-local"> (local wall clock)
 */
export function utcToLocalInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local value → UTC ISO string for API
 */
export function localInputToUTC(localDateTimeStr) {
  if (!localDateTimeStr) return undefined;
  const d = new Date(localDateTimeStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Default schedule in local time for new tests
 */
export function defaultLocalSchedule() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    startTime: utcToLocalInput(start.toISOString()),
    endTime: utcToLocalInput(end.toISOString()),
  };
}

/**
 * Display formatted local date/time for candidates
 */
export function formatLocalDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
