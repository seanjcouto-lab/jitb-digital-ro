import { RepairOrder, ROStatus } from '../types';

/**
 * Calendar utility functions — pure, no side effects, easily testable.
 * All date math uses native Date. No external dependencies.
 */

/** Get Monday-Sunday for the week containing the given date */
export function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

/** Get all weeks (rows) for a month grid. Each row is 7 days (Mon-Sun). */
export function getMonthDays(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from the Monday of the week containing the 1st
  const startDate = getWeekDays(firstDay)[0];

  const weeks: Date[][] = [];
  let current = new Date(startDate);

  while (current <= lastDay || weeks.length < 5) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 6) break; // Max 6 weeks in a month grid
  }

  return weeks;
}

/** Filter ROs that have a date event within a date range */
export function getROsForDateRange(
  ros: RepairOrder[],
  start: Date,
  end: Date
): RepairOrder[] {
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  return ros.filter(ro => {
    const arrival = ro.arrivalDate;
    const pickup = ro.estimatedPickupDate;
    return (arrival && arrival >= startISO && arrival < endISO) ||
           (pickup && pickup >= startISO && pickup < endISO);
  });
}

/** Group ROs by date string (YYYY-MM-DD) for a given date field */
export function groupROsByDate(
  ros: RepairOrder[],
  dateField: 'arrivalDate' | 'estimatedPickupDate'
): Map<string, RepairOrder[]> {
  const map = new Map<string, RepairOrder[]>();

  for (const ro of ros) {
    const val = ro[dateField];
    if (!val) continue;
    const key = toDateKey(new Date(val)); // Local date, not UTC
    const arr = map.get(key) || [];
    arr.push(ro);
    map.set(key, arr);
  }

  return map;
}

/** Get boats currently on dock as of a given date */
export function getBoatsOnDock(ros: RepairOrder[], asOfDate: Date): RepairOrder[] {
  const asOfISO = asOfDate.toISOString();

  return ros.filter(ro => {
    if (!ro.arrivalDate) return false;
    if (ro.arrivalDate > asOfISO) return false; // Not arrived yet
    if (ro.status === ROStatus.COMPLETED) return false; // Already done
    // If pickup date exists and has passed, boat is gone
    if (ro.estimatedPickupDate && ro.estimatedPickupDate < asOfISO) return false;
    return true;
  });
}

/** Format time from ISO string: "9:00 AM" */
export function formatSlotTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format day header: "Mon 4/7" */
export function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  });
}

/** Format short date: "Apr 7" */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
         date.getMonth() === now.getMonth() &&
         date.getDate() === now.getDate();
}

/** Check if two dates are the same calendar day */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/** Get the hour (0-23) from an ISO date string */
export function getHour(isoDate: string): number {
  return new Date(isoDate).getHours();
}

/** Get date key (YYYY-MM-DD) from a Date */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Count arrivals and pickups for a given day */
export function getDayCounts(
  ros: RepairOrder[],
  date: Date
): { arrivals: number; pickups: number } {
  const key = toDateKey(date);
  let arrivals = 0;
  let pickups = 0;

  for (const ro of ros) {
    if (ro.arrivalDate && toDateKey(new Date(ro.arrivalDate)) === key) arrivals++;
    if (ro.estimatedPickupDate && toDateKey(new Date(ro.estimatedPickupDate)) === key) pickups++;
  }

  return { arrivals, pickups };
}
