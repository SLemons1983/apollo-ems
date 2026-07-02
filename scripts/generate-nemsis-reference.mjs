import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceDir = 'src/app/ePCR/reference/nemsis/source';
const outputDir = 'src/app/ePCR/reference/nemsis/generated';

mkdirSync(outputDir, { recursive: true });

function readDefinedList(fileName) {
  const data = JSON.parse(readFileSync(join(sourceDir, fileName), 'utf8'));
  const codes = data?.DefinedList?.Codes?.Code ?? [];

  return codes
    .map((item) => ({
      code: item?.Value?.Value ?? '',
      category: item?.Category ?? 'Uncategorized',
      sourceLabel: item?.SourceLabel ?? '',
      suggestedLabel: item?.SuggestedLabel ?? item?.SourceLabel ?? '',
      note: item?.Note ?? '',
    }))
    .filter((item) => item.code && item.suggestedLabel)
    .sort((a, b) =>
      `${a.category} ${a.suggestedLabel}`.localeCompare(
        `${b.category} ${b.suggestedLabel}`,
      ),
    );
}

function writeReferenceFile(fileName, exportName, items) {
  const content = `export type NemsisClinicalOption = {
  code: string;
  category: string;
  sourceLabel: string;
  suggestedLabel: string;
  note: string;
};

export const ${exportName}: NemsisClinicalOption[] = ${JSON.stringify(
    items,
    null,
    2,
  )};
`;

  writeFileSync(join(outputDir, fileName), content);
  console.log(`Generated ${fileName}: ${items.length} items`);
}

writeReferenceFile(
  'impressions.ts',
  'nemsisImpressionOptions',
  readDefinedList('Impression.json'),
);

writeReferenceFile(
  'symptoms.ts',
  'nemsisSymptomOptions',
  readDefinedList('Symptom.json'),
);

writeReferenceFile(
  'emsConditionCodes.ts',
  'nemsisEmsConditionCodeOptions',
  readDefinedList('Impression.json'),
);
