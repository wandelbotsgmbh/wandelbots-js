import type { TcpPose } from "@wandelbots/nova-api/v1"

export function jointValuesEqual(
  oldJointValues: number[],
  newJointValues: number[],
  changeDeltaThreshold: number,
): boolean {
  if (newJointValues.length !== oldJointValues.length) {
    return true
  }

  for (let jointIndex = 0; jointIndex < newJointValues.length; jointIndex++) {
    if (
      Math.abs(newJointValues[jointIndex]! - oldJointValues[jointIndex]!) >
      changeDeltaThreshold
    ) {
      return false
    }
  }

  return true
}

export function tcpPoseEqual(
  oldTcp: TcpPose | undefined,
  newTcp: TcpPose | undefined,
  changeDeltaThreshold: number,
): boolean {
  // undefined -> defined (+reverse) transition
  if ((oldTcp === undefined && newTcp) || (oldTcp && newTcp === undefined)) {
    return false
  }

  // the typechecker cannot resolve states to "!= undefined" if "&&" is used
  if (oldTcp === undefined || newTcp === undefined) {
    return true
  }

  let changedDelta = 0
  changedDelta += Math.abs(oldTcp.orientation.x - newTcp.orientation.x)
  changedDelta += Math.abs(oldTcp.orientation.y - newTcp.orientation.y)
  changedDelta += Math.abs(oldTcp.orientation.z - newTcp.orientation.z)
  changedDelta += Math.abs(oldTcp.position.x - newTcp.position.x)
  changedDelta += Math.abs(oldTcp.position.y - newTcp.position.y)
  changedDelta += Math.abs(oldTcp.position.z - newTcp.position.z)

  if (changedDelta > changeDeltaThreshold) {
    return false
  }

  return (
    oldTcp.coordinate_system === newTcp.coordinate_system &&
    oldTcp.tcp === newTcp.tcp
  )
}
