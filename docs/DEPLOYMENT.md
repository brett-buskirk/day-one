# Deployment

Day One is a **static, client-only PWA** — `npm run build` produces a self-contained
`dist/` (app shell + compiled content corpus + service worker), with no server
runtime, database, or API. So it deploys anywhere that can serve static files.

Three paths are documented below:

- **[Self-host with nginx](#self-host-with-nginx)** — any Linux box / VM.
- **[Docker](#docker)** — one command, no Node setup on the host.
- **[DigitalOcean App Platform](#digitalocean-app-platform)** — managed, push-to-deploy (this is where the live site runs).

---

## Build it (shared prerequisite)

```bash
npm ci
npm run build      # → dist/  (runs content validation, typecheck, and vite build)
```

`dist/` is the entire deployable artifact. The generated content bundle
(`src/content/corpus.generated.json`) is produced during the build, so it doesn't
need to be in git.

---

## Secure-facility build (no outside-world surfaces)

For deployments inside a secure facility — where residents can't dial a phone number or
open a URL — build with the `VITE_SECURE_BUILD` flag:

```bash
VITE_SECURE_BUILD=1 npm run build      # → dist/  (a secure-facility artifact)
```

This is a **separate build of the same code**, not a runtime toggle, so there is nothing
to dead-end on. Compared to the normal build it strips every outside-world surface:

- the **"Where to get help"** resource directory — the `HelpScreen` and its entry points
  (landing, About, the in-game info card, the debrief) are gone, and the resource data is
  **omitted from the bundle entirely** (the content pipeline emits `resources: []`);
- the **"view source" GitHub link** on the About page;
- the **Plausible analytics snippet** in `index.html` — no outside-world call at all, even
  a privacy-friendly one (`vite.config.ts`'s `analyticsInjector` skips the injection).

Everything else — the full simulation, training/empathy modes, install/offline — is
identical. Deploy `dist/` exactly as below (nginx / Docker / static host). A quick check:
`grep -rl 'dial 211\|github.com\|analytics.brett-buskirk.dev' dist/index.html dist/assets/*.js`
should return nothing.

---

## Self-host with nginx

1. Build (above), then copy `dist/` to your web root, e.g. `/var/www/day-one`.
2. Use the provided [`nginx.conf`](../nginx.conf) as a template (point `root` at your
   `dist/` path). The important bits: an SPA fallback (`try_files … /index.html`), the
   correct `.webmanifest` MIME type, and cache headers — long-cache the hashed
   `/assets/`, but `no-cache` for `index.html` and `sw.js` so clients pick up new
   builds instead of a stale shell.
3. `.app`/HTTPS: serve it over TLS (e.g. Let's Encrypt via certbot). The PWA needs
   HTTPS to install and to register the service worker.

To update: rebuild and replace `dist/`.

---

## Docker

A multi-stage [`Dockerfile`](../Dockerfile) builds the app and serves it with nginx
(using the same `nginx.conf`):

```bash
docker build -t day-one .
docker run -p 8080:80 day-one     # → http://localhost:8080
```

Put it behind your own TLS-terminating reverse proxy / ingress in production.

---

## DigitalOcean App Platform

> Status: **live** at **https://dayone-sim.app** (and the default
> `https://day-one-a7fs5.ondigitalocean.app`), building from `main` with
> `deploy_on_push` — every change merged to `main` auto-builds and redeploys.
> (`main` is branch-protected, so changes arrive via merged PRs, not direct pushes.)

- **App:** `day-one` (static site), in the **"Day One"** DO project.
- **Spec:** [`.do/app.yaml`](../.do/app.yaml).

Created once with:

```bash
doctl apps create --spec .do/app.yaml
# (the "Day One" project is the account default, so it landed there automatically)
```

### DNS — the gotcha worth remembering

`dayone-sim.app` is DNS-hosted at DigitalOcean (nameservers delegated to
`ns1/2/3.digitalocean.com`). Even so, App Platform did **not** auto-create the DNS
records when the app was created via the spec — it treated the domain as
"you manage the DNS yourself" and showed a CNAME instruction. The domain sat stuck
(no records, no cert) until the records were added manually.

**The fix** (matches what App Platform auto-creates for a working apex domain): add
to the `dayone-sim.app` zone —

| Type  | Name  | Data                                |
| ----- | ----- | ----------------------------------- |
| A     | `@`   | `162.159.140.98`                    |
| A     | `@`   | `172.66.0.96`                       |
| CNAME | `www` | `day-one-a7fs5.ondigitalocean.app.` |

(The two A records are App Platform's shared Cloudflare edge — the same IPs for any
App Platform custom domain; routing happens by Host header. **You cannot put a CNAME
on the apex** — DNS forbids it at a zone root and DO has no ALIAS/ANAME substitute,
so apex uses A records.)

```bash
doctl compute domain records create dayone-sim.app --record-type A --record-name @ --record-data 162.159.140.98 --record-ttl 300
doctl compute domain records create dayone-sim.app --record-type A --record-name @ --record-data 172.66.0.96 --record-ttl 300
doctl compute domain records create dayone-sim.app --record-type CNAME --record-name www --record-data day-one-a7fs5.ondigitalocean.app. --record-ttl 300
```

Once those resolve, App Platform issues the Let's Encrypt cert automatically. `.app`
is HTTPS-only, so the domain returns nothing until the cert is fully issued (a few
minutes; the apex cert is the slowest). If the **apex** cert stalls "active but not
serving," **re-add that domain** (remove it, re-add as PRIMARY) to force a fresh cert
request — that's what finally brought it up.

### Operating it

```bash
doctl apps get <APP_ID>                       # status
doctl apps list-deployments <APP_ID>          # deployment history
doctl apps logs <APP_ID> --type build|deploy  # logs
doctl apps create-deployment <APP_ID>         # manual redeploy (or just push to main)
```

Rollback: revert the offending commit (via a PR), or redeploy a prior good deployment.

---

## Pre-merge checklist (merging to `main` deploys to production)

`main` is branch-protected, so changes reach production by **merging a PR**, and
**CI must pass first** (`.github/workflows/ci.yml`: content validation + typecheck +
tests + build). Before opening the PR, sanity-check locally:

- [ ] `npm run build` clean.
- [ ] `npm test` green.
