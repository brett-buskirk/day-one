/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** "1" → a secure-facility build: strips the "Where to get help" resources and the GitHub link. */
  readonly VITE_SECURE_BUILD?: string;
}
