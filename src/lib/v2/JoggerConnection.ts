import type {
  InitializeJoggingRequest,
  JoggingResponse,
  JointVelocityRequest,
  MotionGroupState,
  TcpVelocityRequest,
} from "@wandelbots/nova-api/v2"
import type { AutoReconnectingWebsocket } from "../AutoReconnectingWebsocket"
import { tryParseJson } from "../converters"
import type { NovaClient } from "./NovaClient"
import { axisToIndex } from "./vectorUtils"

export type JoggerConnectionOpts = {
  /**
   * When an error message is received from the jogging websocket, it
   * will be passed here. If this handler is not provided, the error will
   * instead be thrown as an unhandled error.
   */
  onError?: (err: unknown) => void
} & Omit<InitializeJoggingRequest, "message_type">

export class JoggerConnection {
  // Currently a separate websocket is needed for each mode, pester API people
  // to merge these for simplicity
  joggingWebsocket: AutoReconnectingWebsocket | null = null
  lastVelocityRequest: JointVelocityRequest | TcpVelocityRequest | null = null
  lastResponse: JoggingResponse | null = null

  static async open(
    nova: NovaClient,
    cell: string,
    motionGroupId: string,
    opts: JoggerConnectionOpts,
  ) {
    const motionGroupState =
      await nova.api.motionGroupInfos.getCurrentMotionGroupState(motionGroupId)

    return new JoggerConnection(
      nova,
      cell,
      motionGroupId,
      motionGroupState,
      opts,
    )
  }

  constructor(
    readonly nova: NovaClient,
    readonly cell: string,
    readonly motionGroupId: string,
    readonly motionGroupState: MotionGroupState,
    readonly opts: JoggerConnectionOpts,
  ) {
    this.joggingWebsocket = nova.openReconnectingWebsocket(
      `/cells/${cell}/execution/jogging`,
    )
    this.joggingWebsocket.addEventListener("message", (ev: MessageEvent) => {
      const data = tryParseJson(ev.data) as JoggingResponse
      if (data && "error" in data) {
        if (this.opts.onError) {
          this.opts.onError(ev.data)
        } else {
          throw new Error(ev.data)
        }
      }
    })

    this.joggingWebsocket.addEventListener("message", (ev: MessageEvent) => {
      const data = tryParseJson(ev.data)
      if (data && "error" in data) {
        if (this.opts.onError) {
          this.opts.onError(ev.data)
        } else {
          throw new Error(ev.data)
        }
      }
    })
  }

  get jointCount() {
    return this.motionGroupState.joint_current?.joints.length
  }

  get activeWebsocket() {
    return this.joggingWebsocket
  }

  async stop() {
    // Why not call the stopJogging API endpoint?
    // Because this results in the websocket closing and we
    // would like to keep it open for now.
    if (!this.joggingWebsocket) {
      return
    }

    if (this.lastVelocityRequest?.message_type === "JointVelocityRequest") {
      this.joggingWebsocket.sendJson({
        message_type: "JointVelocityRequest",
        velocity: {
          joints: Array.from(new Array(this.jointCount).keys()).map(() => 0),
        },
      } as JointVelocityRequest)
    }

    if (this.lastVelocityRequest?.message_type === "TcpVelocityRequest") {
      this.joggingWebsocket.sendJson({
        message_type: "TcpVelocityRequest",
        rotation: [0, 0, 0],
        translation: [0, 0, 0],
      } as TcpVelocityRequest)
    }
  }

  dispose() {
    if (this.joggingWebsocket) {
      this.joggingWebsocket.dispose()
    }
  }

  /**
   * Start rotation of a single robot joint at the specified velocity
   */
  async startJointRotation({
    joint,
    velocityRadsPerSec,
  }: {
    /** Index of the joint to rotate */
    joint: number
    /** Speed of the rotation in radians per second */
    velocityRadsPerSec: number
  }) {
    if (!this.joggingWebsocket) {
      throw new Error(
        "Joint jogging websocket not connected. Wait for reconnect or open new jogging connection",
      )
    }

    const jointVelocities = new Array(this.jointCount).fill(0)
    jointVelocities[joint] = velocityRadsPerSec

    this.joggingWebsocket.sendJson({
      message_type: "JointVelocityRequest",
      velocity: {
        joints: jointVelocities,
      },
    } as JointVelocityRequest)
  }

  /**
   * Start the TCP moving along a specified axis at a given velocity
   */
  async startTCPTranslation({
    axis,
    velocityMmPerSec,
    useToolCoordinateSystem,
  }: {
    axis: "x" | "y" | "z"
    velocityMmPerSec: number
    useToolCoordinateSystem: boolean
  }) {
    if (!this.joggingWebsocket) {
      throw new Error(
        "Cartesian jogging websocket not connected. Wait for reconnect or open new jogging connection",
      )
    }

    const joggingVector = [0, 0, 0]
    joggingVector[axisToIndex(axis)] = velocityMmPerSec

    this.joggingWebsocket.sendJson({
      message_type: "TcpVelocityRequest",

      translation: joggingVector,
      rotation: [0, 0, 0],
      use_tool_coordinate_system: useToolCoordinateSystem,
    } as TcpVelocityRequest)
  }

  /**
   * Start the TCP rotating around a specified axis at a given velocity
   */
  async startTCPRotation({
    axis,
    velocityRadsPerSec,
    useToolCoordinateSystem,
  }: {
    axis: "x" | "y" | "z"
    velocityRadsPerSec: number
    useToolCoordinateSystem: boolean
  }) {
    if (!this.joggingWebsocket) {
      throw new Error(
        "Cartesian jogging websocket not connected. Wait for reconnect or open new jogging connection",
      )
    }

    const joggingVector = [0, 0, 0]
    joggingVector[axisToIndex(axis)] = velocityRadsPerSec

    this.joggingWebsocket.sendJson({
      message_type: "TcpVelocityRequest",
      rotation: joggingVector,
      translation: [0, 0, 0],
      use_tool_coordinate_system: useToolCoordinateSystem,
    } as TcpVelocityRequest)
  }
}
