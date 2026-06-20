# Deployment (notes for later)

> Status: **not yet deployed.** This is the plan and a ready-to-use spec. Nothing
> goes live until someone runs the `doctl apps create` command below.

## Intent

Deploy Day One publicly for testing/review on **DigitalOcean App Platform** as a
**static site**, grouped under the **"Day One"** DO project, with CI/CD straight
from GitHub (every push to `main` builds and deploys).

- **Domain:** `dayone-sim.app` (primary), `www.dayone-sim.app` (alias).
- **Reference:** the same setup was done for `~/rc-journey-custom` — see its
  `.do/app.yaml` and README "Deploy" section.

## Why a static site fits

Day One is a client-only **Vite PWA** — `npm run build` produces a fully static
`dist/` (app shell + the compiled content corpus + the service worker). There's no
server runtime, so App Platform's free/static tier serves it directly, and the
service worker gives offline + installability once loaded.

The build is self-contained: `npm run build` runs the content pipeline (prebuild),
then `tsc -b`, then `vite build`. The generated corpus is produced at build time,
so the gitignored `src/content/corpus.generated.json` is not needed in git.

## The spec

[`.do/app.yaml`](../.do/app.yaml) — a static site with `deploy_on_push: true`,
`build_command: npm run build`, `output_dir: dist`, `catchall_document: index.html`
(SPA fallback), Node 22 at build time, and the two domains.

## Steps when ready

1. **Create the app** (one time):
   ```bash
   doctl apps create --spec .do/app.yaml
   ```
2. **Assign it to the "Day One" project** (dashboard, or):
   ```bash
   doctl projects list                       # find the Day One project id
   doctl apps list                           # find the new app id
   doctl projects resources assign <PROJECT_ID> --resource=do:app:<APP_ID>
   ```
3. **DNS** for `dayone-sim.app`: point it at App Platform per the dashboard's
   "Domains" instructions (A/ALIAS or DO-managed nameservers), then let the
   automatic Let's Encrypt certificate provision.
4. **Verify:** installable PWA, offline works, and a full run plays through. Then
   share the URL for review.

After step 1, pushing to `main` is the deploy — no further manual steps.

## Pre-deploy checklist

- [ ] `npm run build` is clean locally (it is in CI terms: `tsc -b` + content
      validation gate the build).
- [ ] `npm test` green.
- [ ] Decide whether to keep `dayone-sim.app` apex + `www` alias, or apex-only.
- [ ] Confirm the DO "Day One" project exists (or create it).
