import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const policyPageUrl =
  'https://www.fresnocountyca.gov/Departments/Public-Health/Emergency-Services/Emergency-Medical-Services-EMS/CCEMSA-Policies-and-Procedures';

const outputDir = 'src/app/ePCR/reference/ccemsa/source';

const browserHeaders = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
};

mkdirSync(outputDir, { recursive: true });

function sanitizeFileName(value) {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

console.log('Fetching CCEMSA policy page...');
const pageResponse = await fetch(policyPageUrl, { headers: browserHeaders });

if (!pageResponse.ok) {
  throw new Error(`Failed to fetch policy page: ${pageResponse.status}`);
}

const html = await pageResponse.text();

const pdfLinks = Array.from(
  new Set(
    [...html.matchAll(/href=["']([^"']+\.pdf[^"']*)["']/gi)].map((match) =>
      new URL(match[1], policyPageUrl).toString(),
    ),
  ),
).sort();

console.log(`Found ${pdfLinks.length} PDF links.`);

const manifest = [];

for (const pdfUrl of pdfLinks) {
  const url = new URL(pdfUrl);
  const rawName = basename(url.pathname) || 'ccemsa-policy.pdf';
  const fileName = sanitizeFileName(decodeURIComponent(rawName));
  const outputPath = join(outputDir, fileName);

  console.log(`Downloading ${fileName}`);

  const response = await fetch(pdfUrl, { headers: browserHeaders });

  if (!response.ok) {
    console.warn(`Skipped ${pdfUrl}: ${response.status}`);
    continue;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(outputPath, bytes);

  manifest.push({
    fileName,
    url: pdfUrl,
    sizeBytes: bytes.length,
  });
}

writeFileSync(
  join(outputDir, 'manifest.json'),
  JSON.stringify(
    {
      source: policyPageUrl,
      downloadedAt: new Date().toISOString(),
      count: manifest.length,
      files: manifest,
    },
    null,
    2,
  ),
);

console.log(`Saved ${manifest.length} PDFs to ${outputDir}`);
