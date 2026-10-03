import { registerHooks } from 'node:module';
// Production compilation/Vite resolves extensionless TypeScript imports. Resolve
// those same local imports when running dependency-free tests with Node 24.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      try { return nextResolve(specifier + '.ts', context); }
      catch { return nextResolve(specifier + '/index.ts', context); }
    }
    throw error;
  }
} });
