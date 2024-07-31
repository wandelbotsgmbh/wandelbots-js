import { tryParseJson } from "./converters"
import type {
  ControllerInstance,
  MotionGroupPhysical,
  MotionGroupStateResponse,
} from "@wandelbots/wandelbots-api-client"
import { makeAutoObservable, runInAction } from "mobx"
import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { NovaClient } from "../NovaClient"
import { jointValuesEqual, tcpPoseEqual } from "./motionStateUpdate"

const MOTION_DELTA_THRESHOLD = 0.0001

export type MotionGroupOption = {
  selectionId: string
} & MotionGroupPhysical

/**
 * Store representing the current state of a connected motion group.
 */
export class MotionStreamConnection {
  static async open(nova: NovaClient, motionGroupId: string) {
    const { instances: controllers } =
      await nova.api.controller.listControllers()

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

    const motionStateSocket = nova.openReconnectingWebsocket(
      `/motion-groups/${motionGroupId}/state-stream`,
    )

    console.log("opening websocket!")

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
      nova,
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
    readonly nova: NovaClient,
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
          this.rapidlyChangingMotionState.tcp_pose =
            motionStateResponse.tcp_pose
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
