// Build-time deployment flags.
//
// VITE_SECURE_BUILD=1 produces a *secure-facility* artifact: it strips the outside-world
// surfaces — the "Where to get help" resource directory and the GitHub "view source" link —
// for deployments where incarcerated users can't reach a phone number or a URL. It's a
// build-time flag, not a runtime toggle, so a secure build has nothing to dead-end on:
// Vite folds the constant and tree-shakes the gated UI, and the content pipeline omits the
// resource data from the bundle entirely (see scripts/compile-content.mjs).
//
//   VITE_SECURE_BUILD=1 npm run build
export const SECURE_BUILD = import.meta.env.VITE_SECURE_BUILD === "1";
