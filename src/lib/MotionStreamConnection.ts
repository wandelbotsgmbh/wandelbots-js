import type {
  ControllerInstance,
  MotionGroupPhysical,
  MotionGroupStateResponse,
  Vector3d,
} from "@wandelbots/wandelbots-api-client"
import { makeAutoObservable, runInAction } from "mobx"
import { Vector3 } from "three"
import type { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { tryParseJson } from "./converters"
import { jointValuesEqual, tcpPoseEqual } from "./motionStateUpdate"
import type { NovaCellClient } from "./NovaCellClient"

const MOTION_DELTA_THRESHOLD = 0.0001

function unwrapRotationVector(
  newRotationVectorApi: Vector3d,
  currentRotationVectorApi: Vector3d,
): Vector3d {
  const currentRotationVector = new Vector3(
    currentRotationVectorApi.x,
    currentRotationVectorApi.y,
    currentRotationVectorApi.z,
  )

  const newRotationVector = new Vector3(
    newRotationVectorApi.x,
    newRotationVectorApi.y,
    newRotationVectorApi.z,
  )

  const currentAngle = currentRotationVector.length()
  const currentAxis = currentRotationVector.normalize()

  let newAngle = newRotationVector.length()
  let newAxis = newRotationVector.normalize()

  // Align rotation axes
  if (newAxis.dot(currentAxis) < 0) {
    newAngle = -newAngle
    newAxis = newAxis.multiplyScalar(-1.0)
  }

  // Shift rotation angle close to previous one to extend domain of rotation angles beyond [0, pi]
  // - this simplifies interpolation and prevents abruptly changing signs of the rotation angles
  let angleDifference = newAngle - currentAngle
  angleDifference -=
    2.0 * Math.PI * Math.floor((angleDifference + Math.PI) / (2.0 * Math.PI))

  newAngle = currentAngle + angleDifference

  return newAxis.multiplyScalar(newAngle)
}

/**
 * Store representing the current state of a connected motion group.
 */
export class MotionStreamConnection {
  static async open(cell: NovaCellClient, motionGroupId: string) {
    const { instances: controllers } =
      await cell.api.controller.listControllers()

    const [_motionGroupIndex, controllerId] = motionGroupId.split("@") as [
      string,
      string,
    ]
    const controller = controllers.find((c) => c.controller === controllerId)
    const motionGroup = controller?.physical_motion_groups.find(
      (mg) => mg.motion_group === motionGroupId,
    )
    if (!controller || !motionGroup) {
      throw new Error(
        `Controller ${controllerId} or motion group ${motionGroupId} not found`,
      )
    }

    const motionStateSocket = cell.openReconnectingWebsocket(
      `/motion-groups/${motionGroupId}/state-stream`,
    )

    // Wait for the first message to get the initial state
    const firstMessage = await motionStateSocket.firstMessage()
    console.log("got first message", firstMessage)
    const initialMotionState = tryParseJson(firstMessage.data)
      ?.result as MotionGroupStateResponse

    if (!initialMotionState) {
      throw new Error(
        `Unable to parse initial motion state message ${firstMessage.data}`,
      )
    }

    console.log(
      `Connected motion state websocket to motion group ${motionGroup.motion_group}. Initial state:\n  `,
      initialMotionState,
    )

    return new MotionStreamConnection(
      cell,
      controller,
      motionGroup,
      initialMotionState,
      motionStateSocket,
    )
  }

  // Not mobx-observable as this changes very fast; should be observed
  // using animation frames
  rapidlyChangingMotionState: MotionGroupStateResponse

  constructor(
    readonly cell: NovaCellClient,
    readonly controller: ControllerInstance,
    readonly motionGroup: MotionGroupPhysical,
    readonly initialMotionState: MotionGroupStateResponse,
    readonly motionStateSocket: AutoReconnectingWebsocket,
  ) {
    this.rapidlyChangingMotionState = initialMotionState

    motionStateSocket.addEventListener("message", (event) => {
      const motionStateResponse = tryParseJson(event.data)?.result as
        | MotionGroupStateResponse
        | undefined

      if (!motionStateResponse) {
        throw new Error(
          `Failed to get motion state for ${this.motionGroupId}: ${event.data}`,
        )
      }

      // handle motionState message
      if (
        !jointValuesEqual(
          this.rapidlyChangingMotionState.state.joint_position.joints,
          motionStateResponse.state.joint_position.joints,
          MOTION_DELTA_THRESHOLD,
        )
      ) {
        runInAction(() => {
          this.rapidlyChangingMotionState.state = motionStateResponse.state
        })
      }

      // handle tcpPose message
      if (
        !tcpPoseEqual(
          this.rapidlyChangingMotionState.tcp_pose,
          motionStateResponse.tcp_pose,
          MOTION_DELTA_THRESHOLD,
        )
      ) {
        runInAction(() => {
          if (this.rapidlyChangingMotionState.tcp_pose == undefined) {
            this.rapidlyChangingMotionState.tcp_pose =
              motionStateResponse.tcp_pose
          } else {
            this.rapidlyChangingMotionState.tcp_pose = {
              position: motionStateResponse.tcp_pose!.position,
              orientation: unwrapRotationVector(
                motionStateResponse.tcp_pose!.orientation,
                this.rapidlyChangingMotionState.tcp_pose!.orientation,
              ),
              tcp: motionStateResponse.tcp_pose!.tcp,
              coordinate_system:
                motionStateResponse.tcp_pose!.coordinate_system,
            }
          }
        })
      }
    })
    makeAutoObservable(this)
  }

  get motionGroupId() {
    return this.motionGroup.motion_group
  }

  get controllerId() {
    return this.controller.controller
  }

  get modelFromController() {
    return this.motionGroup.model_from_controller
  }

  get wandelscriptIdentifier() {
    const num = this.motionGroupId.split("@")[0]
    return `${this.controllerId.replaceAll("-", "_")}_${num}`
  }

  get joints() {
    return this.initialMotionState.state.joint_position.joints.map((_, i) => {
      return {
        index: i,
      }
    })
  }

  dispose() {
    this.motionStateSocket.close()
  }
}
