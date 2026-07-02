import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const repoUrl = 'https://git.nemsis.org/scm/nep/nemsis_public.git';
const tempDir = '/tmp/apollo-nemsis-public';
const outputDir = 'src/app/ePCR/reference/nemsis/source';

const definedLists = [
  'CauseOfInjury',
  'Impression',
  'IncidentLocationType',
  'Medication',
  'Procedure',
  'Symptom',
];

const suggestedLists = [
  'EnvironmentalFoodAllergy',
  'MedicalSurgicalHistory',
  'MedicationAllergy',
  'PatientActivity',
];

console.log('Downloading NEMSIS public repository...');

rmSync(tempDir, { recursive: true, force: true });
execFileSync('git', ['clone', '--depth', '1', repoUrl, tempDir], {
  stdio: 'inherit',
});

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

for (const listName of definedLists) {
  const sourcePath = join(tempDir, 'DefinedLists', listName, `${listName}.json`);
  const destinationPath = join(outputDir, `${listName}.json`);

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing defined list: ${sourcePath}`);
  }

  cpSync(sourcePath, destinationPath);
  console.log(`Copied DefinedList: ${listName}`);
}

for (const listName of suggestedLists) {
  const sourcePath = join(tempDir, 'SuggestedLists', listName, `${listName}.json`);
  const destinationPath = join(outputDir, `${listName}.json`);

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing suggested list: ${sourcePath}`);
  }

  cpSync(sourcePath, destinationPath);
  console.log(`Copied SuggestedList: ${listName}`);
}

console.log(`NEMSIS source files saved to ${outputDir}`);
