import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outputDir = 'src/app/ePCR/reference/knowledge-packs/ccemsa/source';

const protocols = [
  {
    id: '547',
    title: 'Patient Destination',
    fileName: '547-patient-destination.pdf',
    url: 'https://www.fresnocountyca.gov/files/assets/county/v/2/public-health/emergency-services/ccems-policies-and-procedures/541-599-operations/547-h.pdf',
  },
];

const headers = {
  'user-agent': 'Mozilla/5.0',
  accept: 'application/pdf,*/*',
};

mkdirSync(outputDir, { recursive: true });

const manifest = [];

for (const protocol of protocols) {
  console.log(`Downloading ${protocol.id} - ${protocol.title}`);

  const response = await fetch(protocol.url, { headers });

  if (!response.ok) {
    console.warn(`Skipped ${protocol.id}: ${response.status}`);
    continue;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const outputPath = join(outputDir, protocol.fileName);

  writeFileSync(outputPath, bytes);

  manifest.push({
    ...protocol,
    localPdf: outputPath,
    sizeBytes: bytes.length,
  });
}

writeFileSync(
  join(outputDir, 'manifest.json'),
  JSON.stringify(
    {
      downloadedAt: new Date().toISOString(),
      count: manifest.length,
      files: manifest,
    },
    null,
    2,
  ),
);

console.log(`Saved ${manifest.length} protocol PDFs.`);
