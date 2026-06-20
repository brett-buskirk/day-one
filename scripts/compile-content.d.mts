// Type surface for the JS content pipeline so vite.config.ts can import it.
export class ContentError extends Error {}

export interface CompileOptions {
  root?: string;
  write?: boolean;
  silent?: boolean;
}

export interface CompileResult {
  corpus: unknown;
  warnings: string[];
  stats: { eventCount: number; characterCount: number };
}

export function compileContent(opts?: CompileOptions): CompileResult;
