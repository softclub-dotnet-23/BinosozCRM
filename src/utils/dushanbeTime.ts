const TIME_ZONE = "Asia/Dushanbe";

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * DateTimeOffset values (CheckInAt, CheckOutAt, IssuedAt, PaidAt, ...) come
 * back from the API as UTC instants. Intl.DateTimeFormat with an explicit
 * timeZone converts the instant for display without touching the underlying
 * value — unlike manually adding 5 hours, this stays correct across the
 * midnight boundary and DST-free Asia/Dushanbe never needs seasonal
 * adjustment. Never use these to build a value sent back to the API; send
 * the original ISO string unchanged.
 */
export function formatDushanbeTime(isoDateTime: string): string {
  return timeFormatter.format(new Date(isoDateTime));
}

export function formatDushanbeDate(isoDateTime: string): string {
  return dateFormatter.format(new Date(isoDateTime));
}

export function formatDushanbeDateTime(isoDateTime: string): string {
  return dateTimeFormatter.format(new Date(isoDateTime));
}
