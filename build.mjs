import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const source = join(root, 'src');
const output = join(root, 'dist');
const routes = [
  ['/', 'home'],
  ['/about/', 'about'],
  ['/work/', 'work'],
  ['/work/qxai/', 'qxai'],
  ['/work/quantumvault/', 'quantumvault'],
  ['/work/mri-research/', 'mri-research'],
  ['/work/accessiblebrowser/', 'accessiblebrowser'],
  ['/work/syndromescope/', 'syndromescope'],
  ['/resume/', 'resume'],
  ['/contact/', 'contact'],
];

await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'assets'), { recursive: true });
await cp(join(source, 'styles.css'), join(output, 'assets', 'styles.css'));
await cp(join(source, 'app.js'), join(output, 'assets', 'app.js'));
await cp(join(source, 'favicon.svg'), join(output, 'assets', 'favicon.svg'));
await cp(join(source, 'assets'), join(output, 'assets'), { recursive: true });
const ragFiles = ['approved-facts.md', 'approved-interview-answers.md'];
const ragContent = Object.fromEntries(await Promise.all(ragFiles.map(async name => [name, await readFile(join(root, 'rag', name), 'utf8')])));
await writeFile(join(root, 'netlify', 'functions', 'generated-knowledge.mjs'), `export const approvedKnowledge = ${JSON.stringify(ragContent)};\n`);
const template = await readFile(join(source, 'template.html'), 'utf8');

for (const [route, page] of routes) {
  const directory = route === '/' ? output : join(output, route.replace(/^\//, '').replace(/\/$/, ''));
  await mkdir(directory, { recursive: true });
  const html = template.replace('data-page=""', `data-page="${page}"`);
  await writeFile(join(directory, 'index.html'), html);
}

await writeFile(join(output, 'robots.txt'), 'User-agent: *\nAllow: /\n');
console.log(`Built ${routes.length} pages in dist/`);
