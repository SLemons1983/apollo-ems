import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const protocolRoot = path.join(repositoryRoot, 'public', 'protocols');
const inventoryPath = path.join(
  repositoryRoot,
  'src',
  'app',
  'ePCR',
  'reference',
  'protocols',
  'protocol-pdf-inventory.json',
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.name.toLowerCase().endsWith('.pdf') ? [absolute] : [];
  }));
  return nested.flat();
}

const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
const expected = new Map(inventory.files.map((file) => [file.path, file]));
const actualPaths = (await walk(protocolRoot))
  .map((absolute) => path.relative(protocolRoot, absolute).split(path.sep).join('/'))
  .sort();
const problems = [];

for (const relativePath of actualPaths) {
  const record = expected.get(relativePath);
  if (!record) {
    problems.push(`Unindexed protocol PDF: ${relativePath}`);
    continue;
  }
  const bytes = await readFile(path.join(protocolRoot, relativePath));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== record.sha256 || bytes.length !== record.size) {
    problems.push(`Changed protocol PDF: ${relativePath}`);
  }
  expected.delete(relativePath);
}

for (const missingPath of expected.keys()) {
  problems.push(`Missing protocol PDF: ${missingPath}`);
}

if (problems.length) {
  console.error('Protocol reference index is out of date:');
  problems.forEach((problem) => console.error(`- ${problem}`));
  console.error('Regenerate and clinically review the protocol index before building.');
  process.exit(1);
}

console.log(`Protocol reference index verified (${actualPaths.length} PDFs).`);
