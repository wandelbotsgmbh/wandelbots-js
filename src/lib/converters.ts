export function tryParseJson(json: unknown): any {
  try {
    return JSON.parse(json as string)
  } catch {
    return undefined
  }
}

export function tryStringifyJson(json: unknown): string | undefined {
  try {
    return JSON.stringify(json)
  } catch {
    return undefined
  }
}

export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Converts object parameters to query string.
 * e.g. { a: "1", b: "2" } => "?a=1&b=2"
 *      {} => ""
 */
export function makeUrlQueryString(obj: Record<string, string>): string {
  const str = new URLSearchParams(obj).toString()
  return str ? `?${str}` : ""
}
