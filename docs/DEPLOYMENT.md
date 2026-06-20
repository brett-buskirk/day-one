# Deployment

> Status: **live.** Day One is deployed on DigitalOcean App Platform, building from
> this repo's `main` with `deploy_on_push` — **every push to `main` auto-builds and
> redeploys**, no manual step.

## Where it lives

- **App:** `day-one` (App Platform static site), in the **"Day One"** DO project.
- **Default URL (always works):** `https://day-one-a7fs5.ondigitalocean.app`
- **Custom domain:** `https://dayone-sim.app` (+ `www.dayone-sim.app`).
- **Spec:** [`.do/app.yaml`](../.do/app.yaml). Reference setup: `~/rc-journey-custom`.

## Why a static site fits

Day One is a client-only **Vite PWA** — `npm run build` produces a fully static
`dist/` (app shell + compiled corpus + service worker), no server runtime. The build
is self-contained: `npm run build` runs the content pipeline (prebuild), `tsc -b`,
then `vite build`. The gitignored `src/content/corpus.generated.json` is regenerated
at build time, so it isn't needed in git.

## How it was created (one-time)

```bash
doctl apps create --spec .do/app.yaml   # app + first build
# "Day One" is the default DO project, so the app landed there automatically.
```

Thereafter: push to `main` → auto build + deploy. To apply spec edits:
`doctl apps update <APP_ID> --spec .do/app.yaml`.

## DNS — the gotcha worth remembering

The domain `dayone-sim.app` is DNS-hosted at DigitalOcean (nameservers delegated to
`ns1/2/3.digitalocean.com`). Despite that, App Platform did **not** auto-create the
DNS records when the app was created via the spec — it treated the domain as
"you manage the DNS yourself" and the dashboard showed a CNAME instruction. The
domain sat stuck (no records, no cert) until the records were added manually.

**The fix** (matches what App Platform auto-creates for `rcjourney.cloud`): add to
the `dayone-sim.app` DO zone —

| Type  | Name | Data                                   |
| ----- | ---- | -------------------------------------- |
| A     | `@`  | `162.159.140.98`                       |
| A     | `@`  | `172.66.0.96`                          |
| CNAME | `www`| `day-one-a7fs5.ondigitalocean.app.`    |

(The two A records are App Platform's shared Cloudflare edge — the same for any
App Platform custom domain; routing happens by Host header.) Once those resolve,
App Platform issues the Let's Encrypt cert automatically. `.app` is HTTPS-only
(HSTS-preloaded), so the domain returns nothing until the cert is fully issued —
expect several minutes; the apex cert is the slowest. A redeploy
(`doctl apps create-deployment <APP_ID>`) nudges cert reconciliation if it stalls.

```bash
# add the records (idempotent with what App Platform wants)
doctl compute domain records create dayone-sim.app --record-type A --record-name @ --record-data 162.159.140.98 --record-ttl 300
doctl compute domain records create dayone-sim.app --record-type A --record-name @ --record-data 172.66.0.96 --record-ttl 300
doctl compute domain records create dayone-sim.app --record-type CNAME --record-name www --record-data day-one-a7fs5.ondigitalocean.app. --record-ttl 300
```

## Operating it

- **Status:** `doctl apps get <APP_ID>` · deployments: `doctl apps list-deployments <APP_ID>`
- **Logs:** `doctl apps logs <APP_ID> --type build|deploy|run`
- **Redeploy:** `doctl apps create-deployment <APP_ID>` (or just push to `main`)
- **Rollback:** redeploy a prior commit, or `doctl apps create-deployment` after reverting.

## Pre-push checklist (push = production)

- [ ] `npm run build` clean (`tsc -b` + content validation gate it).
- [ ] `npm test` green.
