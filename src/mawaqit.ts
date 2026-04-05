/**
 * Fetches embedded `confData` from mawaqit.net (English site only: /en/{slug}).
 * Times are whatever that mosque publishes on mawaqit — not computed locally.
 */

const MAWAQIT_BASE = "https://mawaqit.net/en";

const MAWAQIT_PAGE_RE = /(?:var|let)\s+confData\s*=\s*(.*?);/s;

export interface MawaqitPrayerTimesStrings {
  fajr: string;
  sunrise: string;
  /** JSON key from Mawaqit confData */
  dohr: string;
  asr: string;
  maghreb: string;
  /** JSON key from Mawaqit confData */
  icha: string;
}

export interface MawaqitDayResponse {
  source: "mawaqit";
  masjidId: string;
  pageUrl: string;
  /** Original field names from Mawaqit */
  times: MawaqitPrayerTimesStrings;
  /** Normalized names aligned with the computed endpoint */
  normalized: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghreb: string;
    isha: string;
  };
}

interface ConfData {
  times: string[];
  shuruq: string;
}

function mawaqitPageUrl(masjidId: string): string {
  return `${MAWAQIT_BASE}/${encodeURIComponent(masjidId.trim())}`;
}

function mapMawaqitDay(conf: ConfData): MawaqitPrayerTimesStrings {
  const t = conf.times;
  if (!Array.isArray(t) || t.length < 5) {
    throw new Error("Unexpected confData.times shape from mawaqit.net");
  }
  return {
    fajr: t[0],
    sunrise: conf.shuruq,
    dohr: t[1],
    asr: t[2],
    maghreb: t[3],
    icha: t[4],
  };
}

export async function fetchMawaqitConfData(masjidId: string): Promise<unknown> {
  const id = masjidId.trim();
  if (!id) throw new Error("masjid_id is required");

  const url = mawaqitPageUrl(id);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "PrayAPI/1.0 (MIT; open source prayer times API)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (res.status === 404) {
    const err = new Error(`Mosque not found: ${id}`) as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  if (res.status >= 500) {
    const err = new Error(`mawaqit.net returned ${res.status}`);
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`Failed to fetch mawaqit page: ${res.status}`);
    throw err;
  }

  const html = await res.text();
  const m = html.match(MAWAQIT_PAGE_RE);
  if (!m?.[1]) {
    throw new Error(
      "Could not find confData on page (mawaqit.net layout may have changed)"
    );
  }

  let conf: unknown;
  try {
    conf = JSON.parse(m[1].trim()) as unknown;
  } catch {
    throw new Error("confData JSON could not be parsed");
  }
  return conf;
}

export async function getMawaqitPrayerTimesForDay(
  masjidId: string
): Promise<MawaqitDayResponse> {
  const conf = (await fetchMawaqitConfData(masjidId)) as ConfData;
  const times = mapMawaqitDay(conf);
  const pageUrl = mawaqitPageUrl(masjidId);

  return {
    source: "mawaqit",
    masjidId: masjidId.trim(),
    pageUrl,
    times,
    normalized: {
      fajr: times.fajr,
      sunrise: times.sunrise,
      dhuhr: times.dohr,
      asr: times.asr,
      maghreb: times.maghreb,
      isha: times.icha,
    },
  };
}
