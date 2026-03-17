import { readTextFile } from './fileHelpers';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function parseCsv(text: string, delimiter = ','): ParsedCsv {
  const normalized = normalizeLineEndings(text);
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const nextCharacter = normalized[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && character === delimiter) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (!insideQuotes && character === '\n') {
      currentRow.push(currentField);
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += character;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((value) => value.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.trim());

  return {
    headers,
    rows: dataRows.map((row) => {
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        entry[header] = row[index] ?? '';
      });
      return entry;
    }),
  };
}

export function stringifyCsv(
  rows: Record<string, string | number | boolean | null | undefined>[],
  headers: string[],
  delimiter = ',',
): string {
  const encode = (value: string | number | boolean | null | undefined) => {
    const normalized = value == null ? '' : String(value);
    if (normalized.includes(delimiter) || normalized.includes('"') || normalized.includes('\n')) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  };

  const lines = [
    headers.map((header) => encode(header)).join(delimiter),
    ...rows.map((row) => headers.map((header) => encode(row[header])).join(delimiter)),
  ];

  return lines.join('\n');
}

export async function parseCsvFile(
  sourcePath: string,
  delimiter = ',',
): Promise<ParsedCsv> {
  return parseCsv(await readTextFile(sourcePath), delimiter);
}
