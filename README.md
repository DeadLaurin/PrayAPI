<p align="center">
  <strong>PrayAPI</strong><br/>
  <sub>REST API for Islamic prayer times — computed with <a href="https://github.com/batoulapps/adhan-js">adhan</a>, or optionally from <a href="https://mawaqit.net">mawaqit.net</a> mosque pages.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white" alt="Node"/>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"/>
  <img src="https://img.shields.io/badge/Fastify-5-black?logo=fastify" alt="Fastify"/>
</p>

---

## Features

| Capability | Details |
|------------|---------|
| **Computed times** | Multiple calculation methods (MWL, Umm al-Qura, ISNA, …), Hanafi / Shafi madhab, **adhan** astronomy |
| **Coordinates or city** | `latitude`/`longitude` or country + city substring lookup |
| **Mawaqit (optional)** | Live schedule for a mosque slug via `https://mawaqit.net/en/{slug}` |
| **Docs** | **Swagger UI** at [`/docs`](http://localhost:3000/docs), OpenAPI JSON at `/docs/json` |
| **Production** | Security headers (**Helmet**), configurable CORS, `TRUST_PROXY`, structured logging |

**Mawaqit disclaimer:** This integration depends on a third-party site. If mawaqit.net becomes unreliable or problematic, **the Mawaqit route may be removed** in a future release; the **computed** API remains the supported core.

---

## Quick start

```bash
git clone https://github.com/DeadLaurin/PrayAPI.git
cd PrayAPI
npm ci
npm run build
npm start
```

- API: `http://localhost:3000`  
- Swagger: `http://localhost:3000/docs`  
- Metadata: `http://localhost:3000/v1/meta`

Development with reload:

```bash
npm run dev
```

---

## Configuration

Copy [`.env.example`](.env.example) to `.env` and adjust.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | — | Set to `production` for production deployments |
| `LOG_LEVEL` | `info` in prod / `debug` in dev | Pino log level |
| `TRUST_PROXY` | `false` | Set `true` behind a reverse proxy so `X-Forwarded-*` is trusted |
| `CORS_ORIGIN` | *(unset = any origin)* | e.g. `https://myapp.com` or comma-separated list |

---

## Example requests

**Computed (Riyadh area, Umm al-Qura):**

```http
GET /v1/times?latitude=21.4225&longitude=39.8262&date=2026-04-05&method=umm_al_qura&timezone=Asia/Riyadh
```

**City (date must be `YYYY-MM-DD`):**

```http
GET /v1/times/city?countryCode=DE&city=Munich&date=2026-04-05
```

**Mawaqit (mosque slug):**

```http
GET /v1/times/mawaqit?masjid_id=assalam-argenteuil
```

---

## Docker

Docker is a **good default** for this API: fixed Node version, no “works on my machine” drift, and straightforward deploys (VPS, PaaS, Kubernetes). The image is multi-stage (small runtime, no TypeScript toolchain in production).

**Build and run:**

```bash
docker build -t prayapi .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e TRUST_PROXY=false \
  prayapi
```

**Compose (same as above, one command):**

```bash
docker compose up --build
```

Then open `http://localhost:3000/docs`.

When the app sits **behind** another reverse proxy (nginx, Traefik, cloud LB), run the container with **`TRUST_PROXY=true`** so client IPs and `X-Forwarded-*` headers are correct.

---

## Security

- Run `npm audit` regularly; CI runs `npm audit --audit-level=high`.
- Use **HTTPS** in production (TLS terminates at your load balancer or reverse proxy).
- Set **`CORS_ORIGIN`** to your real front-end origin(s) instead of leaving it open.
- Set **`TRUST_PROXY=true`** only when the app sits behind a trusted proxy.

Full notes: [docs/COMPLIANCE.md](docs/COMPLIANCE.md).

---

## API reference

| Doc | Content |
|-----|---------|
| [docs/API.md](docs/API.md) | All routes and parameters |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Licenses (MIT, GPL data, Mawaqit), disclaimers |

---

## License

[MIT](LICENSE)

---
