export function compress(data: unknown): string {
  return JSON.stringify(data);
}

export function decompress(data: string): unknown {
  return JSON.parse(data);
}
