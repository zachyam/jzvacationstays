import ical from "node-ical";
import ICalGenerator, { ICalCalendar } from "ical-generator";

export type ParsedEvent = {
  uid: string;
  summary: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
};

/**
 * Fetch and parse an iCal feed URL into a list of date-range events.
 */
export async function parseIcalFeed(url: string): Promise<ParsedEvent[]> {
  const events = await ical.async.fromURL(url);
  const parsed: ParsedEvent[] = [];

  for (const [, event] of Object.entries(events)) {
    if (event.type !== "VEVENT") continue;
    if (!event.start || !event.end) continue;

    const start = toDateString(event.start);
    const end = toDateString(event.end);

    if (start && end) {
      parsed.push({
        uid: event.uid || "",
        summary: event.summary || "Blocked",
        start,
        end,
      });
    }
  }

  return parsed;
}

/**
 * Generate an iCal feed from bookings and blocked dates.
 */
export function generateIcalFeed(
  propertyName: string,
  events: Array<{
    uid: string;
    summary: string;
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  }>,
): string {
  const cal: ICalCalendar = ICalGenerator({
    name: `${propertyName} - JZ Vacation Stays`,
    prodId: { company: "JZ Vacation Stays", product: "Calendar" },
  });

  for (const event of events) {
    cal.createEvent({
      id: event.uid,
      summary: event.summary,
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: true,
    });
  }

  return cal.toString();
}

/**
 * Expand a date range (start inclusive, end exclusive) into individual YYYY-MM-DD strings.
 */
export function expandDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current < endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function toDateString(d: Date | string): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}
