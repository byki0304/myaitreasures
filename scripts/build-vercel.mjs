// Vercel's Node build only packages the already generated standalone app.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
if (!html.includes('TreasuresStorage') || !html.includes('data:image/png;base64,')) {
  throw new Error('Rebuild index.html locally with python3 build.py before deployment.');
}
await mkdir(new URL('dist/', root), {recursive:true});
await writeFile(new URL('dist/index.html', root), html);
console.log('Packaged standalone app:',fileURLToPath(new URL('dist/index.html', root)));
