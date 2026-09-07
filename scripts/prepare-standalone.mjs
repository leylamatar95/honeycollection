import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const standalone = join('.next', 'standalone');

if (!existsSync(standalone)) {
  throw new Error('Standalone Next.js output was not generated.');
}

mkdirSync(join(standalone, '.next'), { recursive: true });
cpSync(join('.next', 'static'), join(standalone, '.next', 'static'), {
  recursive: true,
});
cpSync('public', join(standalone, 'public'), { recursive: true });
