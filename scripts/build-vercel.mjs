// Vercel's Node build only packages the already generated standalone app.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
if (!html.includes('TreasuresStorage') || !html.includes('data:image/png;base64,')) {
  throw new Error('Rebuild index.html locally with python3 build.py before deployment.');
}

// Public Firebase Web config only. Never map Admin SDK or service account secrets here.
const FIREBASE_ENV = {
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
  measurementId: 'FIREBASE_MEASUREMENT_ID'
};
const firebaseConfig = Object.fromEntries(
  Object.entries(FIREBASE_ENV).filter(([, name]) => process.env[name]).map(([key, name]) => [key, process.env[name].trim()])
);
let output = html;
if (Object.keys(firebaseConfig).length) {
  const missing = ['apiKey', 'projectId', 'appId'].filter(key => !firebaseConfig[key]).map(key => FIREBASE_ENV[key]);
  if (missing.length) throw new Error('Missing Firebase environment variables: ' + missing.join(', '));
  const json = JSON.stringify(firebaseConfig).replace(/</g, '\\u003c');
  output = html.replace('</head>', `<script>window.TREASURES_FIREBASE_CONFIG=${json};</script></head>`);
  console.log('Injected public Firebase Web config for project:', firebaseConfig.projectId);
}

await mkdir(new URL('dist/', root), {recursive:true});
await writeFile(new URL('dist/index.html', root), output);
for (const file of ['site.webmanifest', 'favicon.ico']) await cp(new URL(file, root), new URL('dist/' + file, root));
await cp(new URL('assets/icons/', root), new URL('dist/assets/icons/', root), {
  recursive: true,
  filter: src => !src.replace(/\\/g, '/').includes('/source')
});
console.log('Packaged standalone app:',fileURLToPath(new URL('dist/index.html', root)));
