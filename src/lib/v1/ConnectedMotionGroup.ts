import type {
  ControllerInstance,
  MotionGroupPhysical,
  MotionGroupSpecification,
  MotionGroupStateResponse,
  Mounting,
  RobotControllerState,
  RobotControllerStateOperationModeEnum,
  RobotControllerStateSafetyStateEnum,
  RobotTcp,
  SafetySetup,
} from "@wandelbots/nova-api/v1"
import { makeAutoObservable, runInAction } from "mobx"
import * as THREE from "three"
import type { AutoReconnectingWebsocket } from "../AutoReconnectingWebsocket"
import { tryParseJson } from "../converters"
import { jointValuesEqual, tcpPoseEqual } from "./motionStateUpdate"
import type { NovaClient } from "./NovaClient"

const MOTION_DELTA_THRESHOLD = 0.0001

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

    const motionStateSocket = nova.openReconnectingWebsocket(
      `/motion-groups/${motionGroupId}/state-stream`,
    )

    // Wait for the first message to get the initial state
    const firstMessage = await motionStateSocket.firstMessage()
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

    // Check if robot is virtual or physical
    const config = await nova.api.controller.getRobotController(
      controller.controller,
    )
    const isVirtual = config.configuration.kind === "VirtualController"

    // If there's a configured mounting, we need it to show the right
    // position of the robot model
    const mounting = await (async () => {
      try {
        const mounting = await nova.api.motionGroupInfos.getMounting(
          motionGroup.motion_group,
        )
        return mounting
      } catch (err) {
        console.error(
          `Error fetching mounting for ${motionGroup.motion_group}`,
          err,
        )
        return null
      }
    })()

    // Open the websocket to monitor controller state for e.g. e-stop
    const controllerStateSocket = nova.openReconnectingWebsocket(
      `/controllers/${controller.controller}/state-stream?response_rate=1000`,
    )

    // Wait for the first message to get the initial state
    const firstControllerMessage = await controllerStateSocket.firstMessage()
    const initialControllerState = tryParseJson(firstControllerMessage.data)
      ?.result as RobotControllerState

    if (!initialControllerState) {
      throw new Error(
        `Unable to parse initial controller state message ${firstControllerMessage.data}`,
      )
    }

    console.log(
      `Connected controller state websocket to controller ${controller.controller}. Initial state:\n  `,
      initialControllerState,
    )

    // Find out what TCPs this motion group has (we need it for jogging)
    const { tcps } = await nova.api.motionGroupInfos.listTcps(motionGroupId)

    const motionGroupSpecification =
      await nova.api.motionGroupInfos.getMotionGroupSpecification(motionGroupId)

    const safetySetup =
      await nova.api.motionGroupInfos.getSafetySetup(motionGroupId)

    return new ConnectedMotionGroup(
      nova,
      controller,
      motionGroup,
      initialMotionState,
      motionStateSocket,
      isVirtual,
      tcps!,
      motionGroupSpecification,
      safetySetup,
      mounting,
      initialControllerState,
      controllerStateSocket,
    )
  }

  connectedJoggingCartesianSocket: WebSocket | null = null
  connectedJoggingJointsSocket: WebSocket | null = null
  planData: any | null // tmp
  joggingVelocity: number = 10

  // Not mobx-observable as this changes very fast; should be observed
  // using animation frames
  rapidlyChangingMotionState: MotionGroupStateResponse

  // Response rate on the websocket should be a bit slower on this one since
  // we don't use the motion data
  controllerState: RobotControllerState

  /**
   * Reflects activation state of the motion group / robot servos. The
   * movement controls in the UI should only be enabled in the "active" state
   */
  activationState: "inactive" | "activating" | "deactivating" | "active" =
    "inactive"

  constructor(
    readonly nova: NovaClient,
    readonly controller: ControllerInstance,
    readonly motionGroup: MotionGroupPhysical,
    readonly initialMotionState: MotionGroupStateResponse,
    readonly motionStateSocket: AutoReconnectingWebsocket,
    readonly isVirtual: boolean,
    readonly tcps: RobotTcp[],
    readonly motionGroupSpecification: MotionGroupSpecification,
    readonly safetySetup: SafetySetup,
    readonly mounting: Mounting | null,
    readonly initialControllerState: RobotControllerState,
    readonly controllerStateSocket: AutoReconnectingWebsocket,
  ) {
    this.rapidlyChangingMotionState = initialMotionState
    this.controllerState = initialControllerState

    // Track controller state updates (e.g. safety state and operation mode)
    controllerStateSocket.addEventListener("message", (event) => {
      const data = tryParseJson(event.data)?.result

      if (!data) {
        return
      }

      runInAction(() => {
        this.controllerState = data
      })
    })

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

  /** Jogging velocity in radians for rotation and joint movement */
  get joggingVelocityRads() {
    return (this.joggingVelocity * Math.PI) / 180
  }

  get joints() {
    return this.initialMotionState.state.joint_position.joints.map((_, i) => {
      return {
        index: i,
      }
    })
  }

  get dhParameters() {
    return this.motionGroupSpecification.dh_parameters
  }

  get safetyZones() {
    return this.safetySetup.safety_zones
  }

  /** Gets the robot mounting position offset in 3D viz coordinates */
  get mountingPosition(): [number, number, number] {
    if (!this.mounting) {
      return [0, 0, 0]
    }

    return [
      this.mounting.pose.position.x / 1000,
      this.mounting.pose.position.y / 1000,
      this.mounting.pose.position.z / 1000,
    ]
  }

  /** Gets the robot mounting position rotation in 3D viz coordinates */
  get mountingQuaternion() {
    const rotationVector = new THREE.Vector3(
      this.mounting?.pose.orientation?.x || 0,
      this.mounting?.pose.orientation?.y || 0,
      this.mounting?.pose.orientation?.z || 0,
    )

    const magnitude = rotationVector.length()
    const axis = rotationVector.normalize()

    return new THREE.Quaternion().setFromAxisAngle(axis, magnitude)
  }

  /**
   * Whether the controller is currently in a safety state
   * corresponding to an emergency stop
   */
  get isEstopActive() {
    const estopStates: RobotControllerStateSafetyStateEnum[] = [
      "SAFETY_STATE_ROBOT_EMERGENCY_STOP",
      "SAFETY_STATE_DEVICE_EMERGENCY_STOP",
    ]

    return estopStates.includes(this.controllerState.safety_state)
  }

  /**
   * Whether the controller is in a safety state
   * that may be non-functional for robot pad purposes
   */
  get isMoveableSafetyState() {
    const goodSafetyStates: RobotControllerStateSafetyStateEnum[] = [
      "SAFETY_STATE_NORMAL",
      "SAFETY_STATE_REDUCED",
    ]

    return goodSafetyStates.includes(this.controllerState.safety_state)
  }

  /**
   * Whether the controller is in an operation mode that allows movement
   */
  get isMoveableOperationMode() {
    const goodOperationModes: RobotControllerStateOperationModeEnum[] = [
      "OPERATION_MODE_AUTO",
      "OPERATION_MODE_MANUAL",
      "OPERATION_MODE_MANUAL_T1",
      "OPERATION_MODE_MANUAL_T2",
    ]

    return goodOperationModes.includes(this.controllerState.operation_mode)
  }

  /**
   * Whether the robot is currently active and can be moved, based on the
   * safety state, operation mode and servo toggle activation state.
   */
  get canBeMoved() {
    return (
      this.isMoveableSafetyState &&
      this.isMoveableOperationMode &&
      this.activationState === "active"
    )
  }

  async deactivate() {
    if (this.activationState !== "active") {
      console.error("Tried to deactivate while already deactivating")
      return
    }

    runInAction(() => {
      this.activationState = "deactivating"
    })

    try {
      await this.nova.api.controller.setDefaultMode(
        this.controllerId,
        "MODE_MONITOR",
      )

      runInAction(() => {
        this.activationState = "inactive"
      })
    } catch (err) {
      runInAction(() => {
        this.activationState = "active"
      })
      throw err
    }
  }

  async activate() {
    if (this.activationState !== "inactive") {
      console.error("Tried to activate while already activating")
      return
    }

    runInAction(() => {
      this.activationState = "activating"
    })

    try {
      await this.nova.api.controller.setDefaultMode(
        this.controllerId,
        "MODE_CONTROL",
      )

      runInAction(() => {
        this.activationState = "active"
      })
    } catch (err) {
      runInAction(() => {
        this.activationState = "inactive"
      })
      throw err
    }
  }

  toggleActivation() {
    if (this.activationState === "inactive") {
      this.activate()
    } else if (this.activationState === "active") {
      this.deactivate()
    }
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
