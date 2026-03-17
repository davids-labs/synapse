export function fileNameFromPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop() ?? filePath;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
