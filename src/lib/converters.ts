export function tryParseJson(json: unknown): any {
  try {
    return JSON.parse(json as string)
  } catch {
    return undefined
  }
}

export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI)
}
