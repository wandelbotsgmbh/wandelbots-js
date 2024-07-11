import { tryParseJson } from "./converters"
import type {
  ControllerInstance,
  MotionGroupPhysical,
  MotionGroupSpecification,
  MotionGroupState,
  RobotTcp,
} from "@wandelbots/wandelbots-api-client"
import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { NovaClient } from "../NovaClient"
import { AxiosError } from "axios"

export type MotionGroupOption = {
  selectionId: string
} & MotionGroupPhysical

/**
 * Store representing the current state of a connected motion group.
 */
export class ConnectedMotionGroup {
  static async connect(
    nova: NovaClient,
    motionGroupId: string,
    controllers: ControllerInstance[],
  ) {
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

    const motionStateSocket = new AutoReconnectingWebsocket(
      `${nova.config.instanceUrl}/cells/${nova.config.cellId}/motion-groups/${motionGroupId}/state-stream`,
      nova.config.username,
      nova.config.password,
    )

    // Wait for the first message to get the initial state
    const firstMessage = await motionStateSocket.firstMessage()
    const initialMotionState = tryParseJson(firstMessage.data)?.result?.state

    if (!initialMotionState) {
      throw new Error(
        `Unable to parse initial motion state message ${firstMessage.data}`,
      )
    }

    console.log(
      `Connected motion state websocket to motion group ${motionGroupId}. Initial state:\n  `,
      initialMotionState,
    )

    // This is used to determine if the robot is virtual or physical
    let isVirtual = false
    try {
      const opMode =
        await nova.api.virtualRobotMode.getOperationMode(controllerId)

      if (opMode) isVirtual = true
    } catch (err) {
      if (err instanceof AxiosError) {
        console.log(
          `Received ${err.status} from getOperationMode, concluding that ${controllerId} is physical`,
        )
      } else {
        throw err
      }
    }

    // Find out what TCPs this motion group has (we need it for jogging)
    const { tcps } = await nova.api.motionGroupInfos.listTcps(motionGroupId)

    const motionGroupSpecification =
      await nova.api.motionGroupInfos.getMotionGroupSpecification(motionGroupId)

    return new ConnectedMotionGroup(
      nova,
      controller,
      motionGroup,
      initialMotionState,
      motionStateSocket,
      isVirtual,
      tcps!,
      motionGroupSpecification,
    )
  }

  connectedJoggingCartesianSocket: WebSocket | null = null
  connectedJoggingJointsSocket: WebSocket | null = null
  planData: any | null // tmp
  joggingVelocity: number = 10

  // Not mobx-observable as this changes very fast; should be observed
  // using animation frames
  rapidlyChangingMotionState: MotionGroupState

  constructor(
    readonly nova: NovaClient,
    readonly controller: ControllerInstance,
    readonly motionGroup: MotionGroupPhysical,
    readonly initialMotionState: MotionGroupState,
    readonly motionStateSocket: AutoReconnectingWebsocket,
    readonly isVirtual: boolean,
    readonly tcps: RobotTcp[],
    readonly motionGroupSpecification: MotionGroupSpecification,
  ) {
    this.rapidlyChangingMotionState = initialMotionState

    motionStateSocket.addEventListener("message", (event) => {
      const data = tryParseJson(event.data)?.result?.state

      if (!data) {
        console.error("Invalid motion state data", event.data)
        return
      }

      this.rapidlyChangingMotionState = data
    })
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

  /** Jogging velocity in radians for rotation and joint movement */
  get joggingVelocityRads() {
    return (this.joggingVelocity * Math.PI) / 180
  }

  get joints() {
    return this.initialMotionState.joint_position.joints.map((_, i) => {
      return {
        index: i,
      }
    })
  }

  get dhParameters() {
    return this.motionGroupSpecification.dh_parameters
  }

  dispose() {
    this.motionStateSocket.close()
    if (this.connectedJoggingCartesianSocket)
      this.connectedJoggingCartesianSocket.close()
    if (this.connectedJoggingJointsSocket)
      this.connectedJoggingJointsSocket.close()
  }

  setJoggingVelocity(velocity: number) {
    this.joggingVelocity = velocity
  }
}
