import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { Country, City } from "country-state-city";
import { corsOriginConfig, logLevel, trustProxyEnabled } from "./env.js";
import {
  listMethods,
  isValidMethodSlug,
  type MethodSlug,
} from "./calculation-methods.js";
import {
  computePrayerTimes,
  dateForPrayerDay,
  resolveTimezone,
  type MadhabSlug,
} from "./prayer-service.js";
import { getMawaqitPrayerTimesForDay } from "./mawaqit.js";
import { registerOpenApi, registerSwaggerUi, schemas } from "./swagger.js";

const DEFAULT_METHOD: MethodSlug = "muslim_world_league";
const DEFAULT_MADHAB: MadhabSlug = "shafi";

function parseNumber(q: unknown, _name: string): number | null {
  if (q === undefined || q === null || q === "") return null;
  const n = typeof q === "string" ? parseFloat(q) : Number(q);
  if (Number.isNaN(n)) return null;
  return n;
}

function badRequest(message: string) {
  return { error: "bad_request", message };
}

export async function buildServer() {
  const app = Fastify({
    logger: { level: logLevel() },
    trustProxy: trustProxyEnabled(),
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
  });

  await app.register(cors, { origin: corsOriginConfig() });
  // CSP disabled: Swagger UI sets its own; combined Helmet CSP breaks /docs
  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  await registerOpenApi(app);

  app.get(
    "/",
    {
      schema: {
        tags: ["meta"],
        summary: "Service info",
        description: "Basic discovery; use **Swagger UI** at `/docs` for full API reference.",
        response: {
          200: {
            type: "object",
            properties: {
              name: { type: "string", example: "PrayAPI" },
              version: { type: "string" },
              docs: { type: "string", description: "JSON metadata endpoint (methods, endpoints)" },
              swagger: { type: "string", description: "Interactive OpenAPI (Swagger UI)" },
            },
          },
        },
      },
    },
    async () => ({
      name: "PrayAPI",
      version: "1",
      docs: "/v1/meta",
      swagger: "/docs",
    })
  );

  app.get("/v1/meta", {
    schema: {
      tags: ["meta"],
      summary: "Metadata",
      description: "Calculation methods, madhab options, and endpoint hints.",
      response: {
        200: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
  }, async () => ({
    methods: listMethods(),
    madhab: [
      { id: "shafi", name: "Shafi / Maliki / Hanbali (Asr shadow factor 1)" },
      { id: "hanafi", name: "Hanafi (Asr shadow factor 2)" },
    ],
    sources: {
      computed:
        "Astronomical calculation (adhan). Use GET /v1/times with latitude, longitude, date.",
      mawaqit:
        "Live data from mawaqit.net for a mosque slug. Use GET /v1/times/mawaqit?masjid_id=",
    },
    mawaqit: {
      note: "Fetches https://mawaqit.net/en/{masjid_slug} only (English pages).",
    },
    endpoints: {
      swaggerUi: "GET /docs",
      openApiJson: "GET /docs/json",
      timesByCoordinates: "GET /v1/times?latitude=&longitude=&date=",
      timesByMawaqit: "GET /v1/times/mawaqit?masjid_id=",
      timesByCity: "GET /v1/times/city?countryCode=&city=&date=",
      countries: "GET /v1/countries",
      cities: "GET /v1/countries/:countryCode/cities?q=&limit=",
    },
  }));

  app.get<{
    Querystring: { masjid_id?: string };
  }>("/v1/times/mawaqit", {
    schema: {
      tags: ["mawaqit"],
      summary: "Prayer times from mawaqit.net",
      description:
        "Fetches the public English mosque page `https://mawaqit.net/en/{slug}` and returns embedded schedule.",
      querystring: {
        type: "object",
        required: ["masjid_id"],
        properties: {
          masjid_id: {
            type: "string",
            description: "Mosque slug, e.g. `assalam-argenteuil`",
            examples: ["assalam-argenteuil"],
          },
        },
      },
      response: {
        200: {
          type: "object",
          additionalProperties: true,
          description: "Mawaqit day payload (times, normalized, locale, pageUrl)",
        },
        400: { description: "Missing masjid_id", ...schemas.error },
        404: { description: "Mosque not found", ...schemas.error },
        502: { description: "Upstream or parse error", ...schemas.error },
      },
    },
  }, async (req, reply) => {
    const masjidId = (req.query.masjid_id ?? "").trim();
    if (!masjidId) {
      return reply
        .status(400)
        .send(badRequest("masjid_id is required (mawaqit.net slug, e.g. assalam-argenteuil)"));
    }

    try {
      const body = await getMawaqitPrayerTimesForDay(masjidId);
      return reply.send(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const statusCode = (e as Error & { statusCode?: number }).statusCode;
      if (statusCode === 404) {
        return reply.status(404).send({ error: "not_found", message: msg });
      }
      req.log.error(e);
      return reply.status(502).send({
        error: "bad_gateway",
        message: msg,
      });
    }
  });

  app.get("/v1/countries", {
    schema: {
      tags: ["geography"],
      summary: "List countries",
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              name: { type: "string" },
              latitude: { type: "string" },
              longitude: { type: "string" },
            },
          },
        },
      },
    },
  }, async (_req, reply) => {
    const list = Country.getAllCountries();
    return reply.send(
      list.map((c) => ({
        code: c.isoCode,
        name: c.name,
        latitude: c.latitude,
        longitude: c.longitude,
      }))
    );
  });

  app.get<{
    Params: { countryCode: string };
    Querystring: { q?: string; limit?: string };
  }>("/v1/countries/:countryCode/cities", {
    schema: {
      tags: ["geography"],
      summary: "List cities in a country",
      params: {
        type: "object",
        required: ["countryCode"],
        properties: {
          countryCode: {
            type: "string",
            description: "ISO 3166-1 alpha-2",
            examples: ["SA", "US", "FR"],
          },
        },
      },
      querystring: {
        type: "object",
        properties: {
          q: { type: "string", description: "Case-insensitive substring on city name" },
          limit: { type: "string", description: "Max results (default 100, max 500)" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            countryCode: { type: "string" },
            count: { type: "integer" },
            cities: { type: "array", items: { type: "object", additionalProperties: true } },
          },
        },
        404: { description: "Unknown country", ...schemas.error },
      },
    },
  }, async (req, reply) => {
    const { countryCode } = req.params;
    const q = (req.query.q ?? "").trim().toLowerCase();
    const limitRaw = parseNumber(req.query.limit, "limit");
    const limit = Math.min(500, Math.max(1, limitRaw ?? 100));

    const upper = countryCode.toUpperCase();
    const cities = City.getCitiesOfCountry(upper) ?? [];
    if (!cities.length) {
      return reply.status(404).send({ error: "not_found", message: "Unknown country code" });
    }

    let filtered: typeof cities = cities;
    if (q) {
      filtered = cities.filter((c) => c.name.toLowerCase().includes(q));
    }

    const sliced = filtered.slice(0, limit);
    return reply.send({
      countryCode: upper,
      count: sliced.length,
      cities: sliced.map((c) => ({
        name: c.name,
        stateCode: c.stateCode,
        latitude: c.latitude,
        longitude: c.longitude,
      })),
    });
  });

  app.get<{
    Querystring: {
      latitude?: string;
      longitude?: string;
      date?: string;
      method?: string;
      madhab?: string;
      timezone?: string;
    };
  }>("/v1/times", {
    schema: {
      tags: ["times"],
      summary: "Computed prayer times (coordinates)",
      description:
        "Uses **adhan** with coordinates and date. Timezone defaults from **geo-tz** when omitted.",
      querystring: {
        type: "object",
        required: ["latitude", "longitude", "date"],
        properties: {
          latitude: { type: "string", description: "Decimal degrees (−90…90)" },
          longitude: { type: "string", description: "Decimal degrees (−180…180)" },
          date: { type: "string", format: "date", description: "YYYY-MM-DD (civil date in resolved timezone)" },
          method: {
            type: "string",
            description: "Calculation method slug (default muslim_world_league). See GET /v1/meta.",
          },
          madhab: { type: "string", enum: ["shafi", "hanafi"], description: "Default shafi" },
          timezone: { type: "string", description: "IANA timezone, e.g. Asia/Riyadh" },
        },
      },
      response: {
        200: {
          type: "object",
          additionalProperties: true,
          description: "source=computed, times with iso + local per prayer",
        },
        400: { description: "Validation or timezone error", ...schemas.error },
        500: { description: "Internal error", ...schemas.error },
      },
    },
  }, async (req, reply) => {
    const lat = parseNumber(req.query.latitude, "latitude");
    const lon = parseNumber(req.query.longitude, "longitude");
    const dateStr = (req.query.date ?? "").trim();
    const methodRaw = (req.query.method ?? DEFAULT_METHOD).toLowerCase().replace(/-/g, "_");
    const madhabRaw = (req.query.madhab ?? DEFAULT_MADHAB).toLowerCase() as MadhabSlug;
    const tzExplicit = (req.query.timezone ?? "").trim();

    if (lat === null || lon === null) {
      return reply.status(400).send(badRequest("latitude and longitude are required"));
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return reply.status(400).send(badRequest("latitude/longitude out of range"));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return reply
        .status(400)
        .send(badRequest("date is required (YYYY-MM-DD, civil date in the resolved timezone)"));
    }
    if (!isValidMethodSlug(methodRaw)) {
      return reply.status(400).send(badRequest(`Unknown method; see GET /v1/meta`));
    }
    if (madhabRaw !== "shafi" && madhabRaw !== "hanafi") {
      return reply.status(400).send(badRequest("madhab must be shafi or hanafi"));
    }

    let timeZone: string;
    try {
      timeZone = resolveTimezone(lat, lon, tzExplicit || undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(400).send(badRequest(msg));
    }

    try {
      dateForPrayerDay(dateStr, timeZone);
    } catch {
      return reply.status(400).send(badRequest("Invalid date for this timezone"));
    }

    try {
      const body = computePrayerTimes({
        latitude: lat,
        longitude: lon,
        date: dateStr,
        method: methodRaw,
        madhab: madhabRaw,
        timeZone,
      });
      return reply.send(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      req.log.error(e);
      return reply.status(500).send({ error: "internal_error", message: msg });
    }
  });

  app.get<{
    Querystring: {
      countryCode?: string;
      city?: string;
      date?: string;
      method?: string;
      madhab?: string;
      timezone?: string;
    };
  }>("/v1/times/city", {
    schema: {
      tags: ["times"],
      summary: "Computed prayer times (city lookup)",
      description: "Resolves coordinates from the city database, then same as GET /v1/times.",
      querystring: {
        type: "object",
        required: ["countryCode", "city", "date"],
        properties: {
          countryCode: { type: "string", description: "ISO country code" },
          city: { type: "string", description: "Substring match; shortest name wins" },
          date: { type: "string", format: "date" },
          method: { type: "string" },
          madhab: { type: "string", enum: ["shafi", "hanafi"] },
          timezone: { type: "string", description: "Optional override" },
        },
      },
      response: {
        200: { type: "object", additionalProperties: true },
        400: { ...schemas.error },
        404: { description: "Country/city not found", ...schemas.error },
        500: { ...schemas.error },
      },
    },
  }, async (req, reply) => {
    const countryCode = (req.query.countryCode ?? "").trim().toUpperCase();
    const cityQuery = (req.query.city ?? "").trim();
    const dateStr = (req.query.date ?? "").trim();
    const methodRaw = (req.query.method ?? DEFAULT_METHOD).toLowerCase().replace(/-/g, "_");
    const madhabRaw = (req.query.madhab ?? DEFAULT_MADHAB).toLowerCase() as MadhabSlug;
    const tzOverride = (req.query.timezone ?? "").trim();

    if (!countryCode || !cityQuery) {
      return reply
        .status(400)
        .send(badRequest("countryCode and city are required (city is matched by substring)"));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return reply.status(400).send(badRequest("date is required (YYYY-MM-DD)"));
    }
    if (!isValidMethodSlug(methodRaw)) {
      return reply.status(400).send(badRequest(`Unknown method; see GET /v1/meta`));
    }
    if (madhabRaw !== "shafi" && madhabRaw !== "hanafi") {
      return reply.status(400).send(badRequest("madhab must be shafi or hanafi"));
    }

    const cities = City.getCitiesOfCountry(countryCode) ?? [];
    if (!cities.length) {
      return reply.status(404).send({ error: "not_found", message: "Unknown country code" });
    }

    const needle = cityQuery.toLowerCase();
    const matches = cities.filter((c) => c.name.toLowerCase().includes(needle));
    if (!matches.length) {
      return reply.status(404).send({
        error: "not_found",
        message: "No city matched; try a shorter substring or GET /v1/countries/:code/cities?q=",
      });
    }

    const city = matches.sort((a, b) => a.name.length - b.name.length)[0];
    const lat = city.latitude != null ? parseFloat(city.latitude) : NaN;
    const lon = city.longitude != null ? parseFloat(city.longitude) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return reply.status(404).send({
        error: "not_found",
        message: "Matched city has no coordinates in the database",
      });
    }

    const country = Country.getCountryByCode(countryCode);
    let timeZone: string;
    try {
      if (tzOverride) {
        timeZone = tzOverride;
      } else if (country?.timezones?.length) {
        timeZone = country.timezones[0].zoneName;
      } else {
        timeZone = resolveTimezone(lat, lon);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return reply.status(400).send(badRequest(msg));
    }

    try {
      dateForPrayerDay(dateStr, timeZone);
    } catch {
      return reply.status(400).send(badRequest("Invalid date for this timezone"));
    }

    try {
      const computed = computePrayerTimes({
        latitude: lat,
        longitude: lon,
        date: dateStr,
        method: methodRaw,
        madhab: madhabRaw,
        timeZone,
      });
      const body = {
        location: {
          countryCode,
          city: city.name,
          stateCode: city.stateCode,
        },
        ...computed,
      };
      return reply.send(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      req.log.error(e);
      return reply.status(500).send({ error: "internal_error", message: msg });
    }
  });

  await registerSwaggerUi(app);

  return app;
}
