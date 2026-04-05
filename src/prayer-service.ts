import {
  Coordinates,
  Madhab,
  PrayerTimes,
  type CalculationParameters,
} from "adhan";
import { DateTime } from "luxon";
import { find as findTimezones } from "geo-tz";
import type { MethodSlug } from "./calculation-methods.js";
import { getCalculationParams } from "./calculation-methods.js";

export type MadhabSlug = "shafi" | "hanafi";

/** Gregorian day in `timeZone`, as a Date whose local Y/M/D match that day (run server with TZ=UTC for consistency). */
export function dateForPrayerDay(isoDate: string, timeZone: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date");
  const dt = DateTime.fromObject({ year: y, month: m, day: d }, { zone: timeZone });
  if (!dt.isValid) throw new Error("Invalid date for timezone");
  return new Date(Date.UTC(dt.year, dt.month - 1, dt.day));
}

export function resolveTimezone(
  latitude: number,
  longitude: number,
  explicit?: string
): string {
  if (explicit?.trim()) return explicit.trim();
  const zones = findTimezones(latitude, longitude);
  if (!zones.length) {
    throw new Error(
      "Could not infer IANA timezone from coordinates; pass timezone explicitly"
    );
  }
  return zones[0];
}

export function applyMadhab(
  params: CalculationParameters,
  madhab: MadhabSlug
): void {
  params.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
}

const PRAYER_KEYS = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "sunset",
  "maghrib",
  "isha",
] as const;

export type PrayerKey = (typeof PRAYER_KEYS)[number];

function formatLocalTime(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return fmt.format(date);
}

export function computePrayerTimes(input: {
  latitude: number;
  longitude: number;
  date: string;
  method: MethodSlug;
  madhab: MadhabSlug;
  timeZone: string;
}) {
  const params = getCalculationParams(input.method);
  if (!params) throw new Error("Unknown calculation method");

  applyMadhab(params, input.madhab);

  const coords = new Coordinates(input.latitude, input.longitude);
  const day = dateForPrayerDay(input.date, input.timeZone);
  const pt = new PrayerTimes(coords, day, params);

  const times: Record<PrayerKey, { iso: string; local: string }> = {} as Record<
    PrayerKey,
    { iso: string; local: string }
  >;

  for (const key of PRAYER_KEYS) {
    const d = pt[key] as Date;
    times[key] = {
      iso: d.toISOString(),
      local: formatLocalTime(d, input.timeZone),
    };
  }

  return {
    source: "computed" as const,
    date: input.date,
    timeZone: input.timeZone,
    method: input.method,
    madhab: input.madhab,
    coordinates: { latitude: input.latitude, longitude: input.longitude },
    times,
  };
}
