import * as THREE from "three"

// Vector used by api endpoints
export type Vector3d = [number, number, number]

export function axisToIndex(axis: "x" | "y" | "z"): number {
  switch (axis) {
    case "x":
      return 0
    case "y":
      return 1
    case "z":
      return 2
  }
}

export function indexToAxis(index: number): "x" | "y" | "z" | null {
  switch (index) {
    case 0:
      return "x"
    case 1:
      return "y"
    case 2:
      return "z"
    default:
      return null
  }
}

export function vector3FromArray(vector: Vector3d): THREE.Vector3 {
  return new THREE.Vector3(vector[0], vector[1], vector[2])
}

export function vector3ToArray(vector: THREE.Vector3): Vector3d {
  return [vector.x, vector.y, vector.z]
}
