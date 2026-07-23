import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { compileContent, ContentError } from "./scripts/compile-content.mjs";

// Runs the YAML→JSON content pipeline as part of the Vite lifecycle: once at
// build/serve start, and again whenever a content/, schema/, or flags file
// changes during dev. A ContentError fails the build (and shows in the dev
// overlay) so corrupt content never ships — docs/SPRINTS.md Sprint 0.
function contentPipeline(): Plugin {
  const run = () => {
    try {
      compileContent({ write: true });
    } catch (err) {
      if (err instanceof ContentError) {
        // Re-throw as a plain error so Vite surfaces the message cleanly.
        throw new Error("\n" + err.message + "\n");
      }
      throw err;
    }
  };

  return {
    name: "day-one:content-pipeline",
    buildStart() {
      run();
    },
    configureServer(server) {
      const watched = [/content[\\/].*\.ya?ml$/, /schema[\\/].*\.json$/, /flags\.json$/];
      const onChange = (file: string) => {
        if (watched.some((re) => re.test(file))) {
          try {
            run();
            server.ws.send({ type: "full-reload" });
          } catch (err) {
            server.config.logger.error(String(err instanceof Error ? err.message : err));
          }
        }
      };
      server.watcher.add(["content/**/*.yaml", "content/**/*.yml", "schema/*.json"]);
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
    },
  };
}

// Injects the Plausible analytics snippet into index.html. Skipped entirely for
// secure-facility builds (VITE_SECURE_BUILD=1, see src/ui/build.ts) — that build
// exists specifically so incarcerated users behind a locked-down network never get
// an outside-world call, and analytics shouldn't be the exception.
function analyticsInjector(): Plugin {
  const SNIPPET = `
    <!-- Privacy-friendly analytics by Plausible -->
    <script async src="https://analytics.brett-buskirk.dev/js/pa-sxICBEPqU7njvZLnJOsGR.js"></script>
    <script>
      window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
      plausible.init()
    </script>
  `;

  return {
    name: "day-one:analytics-injector",
    transformIndexHtml(html) {
      if (process.env.VITE_SECURE_BUILD === "1") return html;
      return html.replace("</head>", `${SNIPPET}\n  </head>`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    contentPipeline(),
    react(),
    analyticsInjector(),
    VitePWA({
      // "prompt", not "autoUpdate": a new deploy surfaces a "Refresh" prompt
      // (see src/ui/UpdatePrompt.tsx) instead of silently reloading an open tab,
      // so a player is never yanked out of a run mid-week.
      registerType: "prompt",
      // We own public/manifest.webmanifest (linked from index.html), so the
      // plugin manages only the service worker, not the manifest.
      manifest: false,
      includeAssets: ["manifest.webmanifest", "icons/*.png"],
      workbox: {
        // Precache the app shell + compiled corpus so a run works fully offline.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,webmanifest}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Let the SW register in dev so the install/offline path is testable.
        enabled: false,
      },
    }),
  ],
});
