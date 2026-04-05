# Compliance, licensing, and third-party services

This document explains how PrayAPI relates to open source, third-party data, and your responsibilities when you deploy or use it.

## PrayAPI itself (this repository)

- **License:** [MIT](../LICENSE). You may use, modify, and distribute the code freely, subject to the MIT terms.
- **No warranty:** The software is provided “as is,” without guarantees about accuracy, uptime, or fitness for worship or any other purpose. Always verify prayer times with your local mosque or authority when required.

## Computed prayer times (`adhan`)

- The **computed** endpoints use the [adhan](https://github.com/batoulapps/adhan-js) library (MIT). Times are calculated locally from coordinates, date, method, and madhab. Accuracy depends on the chosen method and astronomical models; it does not replace mosque-specific schedules where those differ.

## Geographic data (`country-state-city`)

- City and country lists come from the [country-state-city](https://github.com/harpreetkhalsagtbit/country-state-city) package, which is **GPL-3.0**.
- If you **distribute** a combined work that includes this dependency (for example, a packaged application containing this API and that library), GPL-3.0 obligations may apply to your distribution. Many teams are fine running the stack privately; consult your counsel if you ship a product. Replacing this dependency with data under a more permissive license is possible if you need to avoid GPL.

## Mawaqit fetch (`mawaqit.net`)

- This integration is **optional** and may be **removed** in a future release if mawaqit.net changes, blocks access, or creates maintenance or legal issues. Rely on **computed** (`adhan`) endpoints for a stable, self-contained API.
- The **Mawaqit** option requests public mosque pages from **mawaqit.net** (English URLs only: `/en/…`) and reads the same embedded configuration the site uses for display.
- PrayAPI is **not affiliated with, endorsed by, or sponsored by** mawaqit.net or its operators.
- **You** are responsible for using this feature in line with **mawaqit.net’s terms of use**, **robots.txt**, and applicable law (copyright, computer misuse, data protection, etc.). Heavy or abusive traffic may be blocked by them or expose you to liability.
- Prefer **low request rates**, **caching**, and the **computed** endpoints when you do not need mosque-specific Mawaqit schedules.
- Prayer times returned from Mawaqit are **their** data for that listing; PrayAPI does not verify them.

## Privacy

- This server does not require end-user accounts. Logs may include IP addresses if you enable HTTP logging; configure retention and notices to match your deployment’s privacy requirements (GDPR and similar where applicable).

## Religious use

- Prayer times are sensitive for worship. This API is a **tool**; local moonsighting committees, mosques, and schools of thought may differ. The authors do not issue religious rulings.
