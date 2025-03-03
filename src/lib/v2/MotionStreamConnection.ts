import type {
  Controller,
  MotionGroupPhysical,
  MotionGroupState,
} from "@wandelbots/nova-api/v2"
import { makeAutoObservable, runInAction } from "mobx"
import * as THREE from "three"
import type { AutoReconnectingWebsocket } from "../AutoReconnectingWebsocket"
import { tryParseJson } from "../converters"
import { jointValuesEqual, tcpPoseEqual } from "./motionStateUpdate"
import type { NovaClient } from "./NovaClient"
import { Vector3d, vector3ToArray } from "./vectorUtils"

const MOTION_DELTA_THRESHOLD = 0.0001

function unwrapRotationVector(
  newRotationVectorApi: Vector3d,
  currentRotationVectorApi: Vector3d,
): Vector3d {
  const currentRotationVector = new THREE.Vector3(
    currentRotationVectorApi[0],
    currentRotationVectorApi[1],
    currentRotationVectorApi[2],
  )

  const newRotationVector = new THREE.Vector3(
    newRotationVectorApi[0],
    newRotationVectorApi[1],
    newRotationVectorApi[2],
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

  return vector3ToArray(newAxis.multiplyScalar(newAngle))
}

/**
 * Store representing the current state of a connected motion group.
 */
export class MotionStreamConnection {
  static async open(nova: NovaClient, motionGroupId: string) {
    const { controllers: controllers } =
      await nova.api.controller.listControllers()

    const [_motionGroupIndex, controllerId] = motionGroupId.split("@") as [
      string,
      string,
    ]
    const controller = controllers.find((c) => c.controller === controllerId)
    const motionGroup = controller?.motion_groups.find(
      (mg) => mg.motion_group === motionGroupId,
    )
    if (!controller || !motionGroup) {
      throw new Error(
        `Controller ${controllerId} or motion group ${motionGroupId} not found`,
      )
    }

    const motionStateSocket = nova.openReconnectingWebsocket(
      `/motion-groups/${motionGroupId}/state-stream`,
    )

    // Wait for the first message to get the initial state
    const firstMessage = await motionStateSocket.firstMessage()
    console.log("got first message", firstMessage)
    const initialMotionState = tryParseJson(firstMessage.data)
      ?.result as MotionGroupState

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
      nova,
      controller,
      motionGroup,
      initialMotionState,
      motionStateSocket,
    )
  }

  // Not mobx-observable as this changes very fast; should be observed
  // using animation frames
  rapidlyChangingMotionState: MotionGroupState

  constructor(
    readonly nova: NovaClient,
    readonly controller: Controller,
    readonly motionGroup: MotionGroupPhysical,
    readonly initialMotionState: MotionGroupState,
    readonly motionStateSocket: AutoReconnectingWebsocket,
  ) {
    this.rapidlyChangingMotionState = initialMotionState

    motionStateSocket.addEventListener("message", (event) => {
      const motionState = tryParseJson(event.data)?.result as
        | MotionGroupState
        | undefined

      if (!motionState) {
        throw new Error(
          `Failed to get motion state for ${this.motionGroupId}: ${event.data}`,
        )
      }

      // handle motionState message
      if (
        !jointValuesEqual(
          this.rapidlyChangingMotionState.joint_position.joints,
          motionState.joint_position.joints,
          MOTION_DELTA_THRESHOLD,
        )
      ) {
        runInAction(() => {
          this.rapidlyChangingMotionState = motionState
        })
      }

      // handle tcpPose message
      if (
        !tcpPoseEqual(
          this.rapidlyChangingMotionState.tcp_pose,
          motionState.tcp_pose,
          MOTION_DELTA_THRESHOLD,
        )
      ) {
        runInAction(() => {
          if (this.rapidlyChangingMotionState.tcp_pose == undefined) {
            this.rapidlyChangingMotionState.tcp_pose = motionState.tcp_pose
          } else {
            this.rapidlyChangingMotionState.tcp_pose = {
              position: motionState.tcp_pose!.position,
              orientation: unwrapRotationVector(
                motionState.tcp_pose!.orientation as Vector3d,
                this.rapidlyChangingMotionState.tcp_pose!
                  .orientation as Vector3d,
              ),
              tcp: motionState.tcp_pose!.tcp,
              coordinate_system: motionState.tcp_pose!.coordinate_system,
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
    return this.initialMotionState.joint_position.joints.map((_, i) => {
      return {
        index: i,
      }
    })
  }

  dispose() {
    this.motionStateSocket.close()
  }
}
