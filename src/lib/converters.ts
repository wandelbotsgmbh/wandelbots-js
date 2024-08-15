import type { Pose } from "@wandelbots/wandelbots-api-client"

/** Try to parse something as JSON; return undefined if we can't */
export function tryParseJson(json: unknown): any {
  try {
    return JSON.parse(json as string)
  } catch {
    return undefined
  }
}

/** Try to turn something into JSON; return undefined if we can't */
export function tryStringifyJson(json: unknown): string | undefined {
  try {
    return JSON.stringify(json)
  } catch {
    return undefined
  }
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

/** Convert radians to degrees */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

/** Convert degrees to radians */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Convert a Pose object representing a motion group position
 * into a string which represents that pose in Wandelscript.
 */
export function poseToWandelscriptString(
  pose: Pick<Pose, "position" | "orientation">,
) {
  const position = [pose.position.x, pose.position.y, pose.position.z]
  const orientation = [
    pose.orientation?.x ?? 0,
    pose.orientation?.y ?? 0,
    pose.orientation?.z ?? 0,
  ]

  const positionValues = position.map((v) => parseFloat(v.toFixed(1)))
  // Rotation needs more precision since it's in radians
  const rotationValues = orientation.map((v) => parseFloat(v.toFixed(4)))

  return `(${positionValues.concat(rotationValues).join(", ")})`
}
