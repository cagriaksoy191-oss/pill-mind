import { pathToFileURL } from 'node:url';
import { resolve as pathResolve } from 'node:path';
import { existsSync } from 'node:fs';

export async function resolve(specifier, context, defaultResolve) {
  let nextSpecifier = specifier;

  // Handle @/ alias
  if (nextSpecifier.startsWith('@/')) {
    nextSpecifier = pathToFileURL(pathResolve(process.cwd(), nextSpecifier.slice(2))).href;
  }

  // Handle missing extensions for relative imports or aliases
  if (nextSpecifier.startsWith('file://') || nextSpecifier.startsWith('./') || nextSpecifier.startsWith('../')) {
    const url = nextSpecifier.startsWith('file://') ? new URL(nextSpecifier) : new URL(nextSpecifier, context.parentURL);
    if (!url.pathname.endsWith('.ts') && !url.pathname.endsWith('.js') && !url.pathname.endsWith('.mjs') && !url.pathname.endsWith('.json')) {
      const tsPath = url.pathname + '.ts';
      const tsxPath = url.pathname + '.tsx';
      if (existsSync(tsPath)) {
        nextSpecifier = pathToFileURL(tsPath).href;
      } else if (existsSync(tsxPath)) {
        nextSpecifier = pathToFileURL(tsxPath).href;
      }
    }
  }

  // Mock next/server
  if (nextSpecifier === 'next/server') {
    return {
      url: 'data:text/javascript,export const NextResponse = { json: (body, init) => ({ status: init?.status || 200, json: async () => body }) };',
      shortCircuit: true
    };
  }

  return defaultResolve(nextSpecifier, context, defaultResolve);
}
