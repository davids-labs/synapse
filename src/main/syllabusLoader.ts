import { SyllabusJsonSchema } from '../shared/schemas';
import type { SyllabusJson } from '../shared/types';
import { readJsonFile, safeJoin } from './fileHelpers';

export async function loadSyllabus(coursePath: string): Promise<SyllabusJson> {
  return readJsonFile(safeJoin(coursePath, '_meta', 'syllabus.json'), SyllabusJsonSchema);
}
