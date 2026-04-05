# PrayAPI HTTP reference

Base URL: `http://localhost:3000` (or your deployed host). All JSON responses use `application/json` unless noted.

## Swagger / OpenAPI

| URL | Description |
|-----|-------------|
| `/docs` | **Swagger UI** — interactive documentation and “Try it out” requests |
| `/docs/json` | OpenAPI **3.1** JSON document (machine-readable) |

The UI is generated from the same route schemas the server uses at runtime.

## Discovery

### `GET /`

Returns a short JSON object with the service name and a pointer to metadata.

### `GET /v1/meta`

Returns:

- **`methods`** — Supported calculation method slugs for computed times.
- **`madhab`** — `shafi` vs `hanafi` (Asr shadow length).
- **`sources`** — Short description of `computed` vs `mawaqit`.
- **`endpoints`** — Summary of route paths.

---

## Computed times (local calculation)

Uses [adhan](https://github.com/batoulapps/adhan-js) with your coordinates and date. Response includes `"source": "computed"`.

### `GET /v1/times`

| Query parameter | Required | Description |
|-----------------|----------|-------------|
| `latitude` | Yes | Decimal degrees, −90…90 |
| `longitude` | Yes | Decimal degrees, −180…180 |
| `date` | Yes | `YYYY-MM-DD` (civil date in the resolved timezone) |
| `method` | No | Default `muslim_world_league`. See `/v1/meta` for slugs. |
| `madhab` | No | `shafi` (default) or `hanafi` |
| `timezone` | No | IANA name (e.g. `Asia/Riyadh`). If omitted, inferred from coordinates via **geo-tz**. |

**Response — `times`:** Each prayer key (`fajr`, `sunrise`, `dhuhr`, `asr`, `sunset`, `maghrib`, `isha`) has:

- `iso` — ISO 8601 instant (UTC).
- `local` — Wall-clock time in the resolved timezone (`HH:MM:SS`).

### `GET /v1/times/city`

Same calculation as `/v1/times`, but coordinates come from the city database.

| Query parameter | Required | Description |
|-----------------|----------|-------------|
| `countryCode` | Yes | ISO 3166-1 alpha-2 (e.g. `SA`, `US`) |
| `city` | Yes | Substring match on city name (shortest name match wins) |
| `date` | Yes | `YYYY-MM-DD` |
| `method` | No | Same as `/v1/times` |
| `madhab` | No | Same as `/v1/times` |
| `timezone` | No | If omitted, uses the country’s first timezone from the dataset when available, else geo-tz from city coordinates |

**Response** includes `location` (`countryCode`, `city`, `stateCode`) plus the same computed payload as `/v1/times`.

---

## Mawaqit fetch (live mosque schedule)

Reads the public page on **mawaqit.net** and returns the same day’s times the site embeds. No latitude/longitude calculation on our side.

### `GET /v1/times/mawaqit`

| Query parameter | Required | Description |
|-----------------|----------|-------------|
| `masjid_id` | Yes | URL slug as on mawaqit (e.g. `assalam-argenteuil`) |

**URL:** Always `https://mawaqit.net/en/{masjid_id}` (English pages only).

**Response:**

- `source`: `"mawaqit"`
- `masjidId`, `pageUrl`
- `times` — Raw field names from Mawaqit (`dohr`, `icha`, …)
- `normalized` — Aliases aligned with the computed API (`dhuhr`, `isha`, …)

**Errors:** `404` if the mosque page is missing; `502` if the page cannot be parsed or mawaqit is unavailable.

---

## Geography helpers

### `GET /v1/countries`

List of countries with `code`, `name`, `latitude`, `longitude`.

### `GET /v1/countries/:countryCode/cities`

| Query parameter | Required | Description |
|-----------------|----------|-------------|
| `q` | No | Case-insensitive substring filter on city name |
| `limit` | No | Max cities (default 100, max 500) |

---

## CORS

Cross-origin requests are allowed from any origin by default (`@fastify/cors`). Tighten this in production if needed.
