import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { NovaClient } from "../NovaClient"
import { makeUrlQueryString } from "./converters"
import { MotionStreamConnection } from "./MotionStreamConnection"

export class JoggerConnection {
  // Currently a separate websocket is needed for each mode, pester API people
  // to merge these for simplicity
  cartesianWebsocket: AutoReconnectingWebsocket | null = null
  jointWebsocket: AutoReconnectingWebsocket | null = null
  cartesianJoggingOpts: {
    tcpId?: string
    coordSystemId?: string
  } = {}

  static async open(nova: NovaClient, motionGroupId: string) {
    const motionStream = await nova.connectMotionStream(motionGroupId)

    return new JoggerConnection(motionStream)
  }

  constructor(readonly motionStream: MotionStreamConnection) {}

  get motionGroupId() {
    return this.motionStream.motionGroupId
  }

  get nova() {
    return this.motionStream.nova
  }

  get numJoints() {
    return this.motionStream.joints.length
  }

  get activeJoggingMode() {
    if (this.cartesianWebsocket) return "cartesian"
    if (this.jointWebsocket) return "joint"
    return "increment"
  }

  get activeWebsocket() {
    return this.cartesianWebsocket || this.jointWebsocket
  }

  async dispose() {
    if (this.cartesianWebsocket) {
      this.cartesianWebsocket.close()
    }

    if (this.jointWebsocket) {
      this.jointWebsocket.close()
    }
  }

  async stop() {
    // Why not call the stopJogging API endpoint?
    // Because this results in the websocket closing and we
    // would like to keep it open for now.

    if (this.cartesianWebsocket) {
      this.cartesianWebsocket.sendJson({
        motion_group: this.motionGroupId,
        position_direction: { x: 0, y: 0, z: 0 },
        rotation_direction: { x: 0, y: 0, z: 0 },
        position_velocity: 0,
        rotation_velocity: 0,
        tcp: this.cartesianJoggingOpts.tcpId,
        coordinate_system: this.cartesianJoggingOpts.coordSystemId,
      })
    }

    if (this.jointWebsocket) {
      this.jointWebsocket.sendJson({
        motion_group: this.motionGroupId,
        joint_velocities: new Array(this.numJoints).fill(0),
      })
    }
  }

  setJoggingMode(
    mode: "cartesian" | "joint" | "increment",
    cartesianJoggingOpts?: {
      tcpId?: string
      coordSystemId?: string
    },
  ) {
    console.log("Setting jogging mode to", mode)
    if (cartesianJoggingOpts) {
      this.cartesianJoggingOpts = cartesianJoggingOpts
    }

    if (mode !== "cartesian" && this.cartesianWebsocket) {
      this.cartesianWebsocket.close()
      this.cartesianWebsocket = null
    }

    if (mode !== "joint" && this.jointWebsocket) {
      this.jointWebsocket.close()
      this.jointWebsocket = null
    }

    if (mode === "cartesian" && !this.cartesianWebsocket) {
      // TODO clarify when and whether these params are needed in
      // the query string vs. the message body
      const queryString = makeUrlQueryString({
        tcp: this.cartesianJoggingOpts.tcpId || "",
        response_coordinate_system:
          this.cartesianJoggingOpts.coordSystemId || "",
      })

      this.cartesianWebsocket = this.nova.openReconnectingWebsocket(
        `/motion-groups/move-tcp` + queryString,
      )
    }

    if (mode === "joint" && !this.jointWebsocket) {
      this.jointWebsocket = this.nova.openReconnectingWebsocket(
        `/motion-groups/move-joint`,
      )
    }
  }

  /**
   * Start rotation of a single robot joint at the specified velocity
   */
  async startJointRotation({
    joint,
    direction,
    velocityRadsPerSec,
  }: {
    /** Index of the joint to rotate */
    joint: number
    /** Direction of rotation ("+" or "-") */
    direction: "+" | "-"
    /** Speed of the rotation in radians per second */
    velocityRadsPerSec: number
  }) {
    if (!this.jointWebsocket) {
      throw new Error(
        "Joint jogging websocket not connected; call setJoggingMode first",
      )
    }

    const jointVelocities = new Array(this.numJoints).fill(0)

    jointVelocities[joint] =
      direction === "-" ? -velocityRadsPerSec : velocityRadsPerSec

    this.jointWebsocket.sendJson({
      motion_group: this.motionGroupId,
      joint_velocities: jointVelocities,
    })
  }

  /**
   * Start the TCP moving along a specified axis at a given velocity
   */
  async startTCPTranslation({
    axis,
    direction,
    velocityMmPerSec,
  }: {
    axis: "x" | "y" | "z"
    direction: "-" | "+"
    velocityMmPerSec: number
  }) {
    if (!this.cartesianWebsocket) {
      throw new Error(
        "Cartesian jogging websocket not connected; call setJoggingMode first",
      )
    }

    const zeroVector = { x: 0, y: 0, z: 0 }
    const joggingVector = Object.assign({}, zeroVector)
    joggingVector[axis] = direction === "-" ? -1 : 1

    this.cartesianWebsocket.sendJson({
      motion_group: this.motionGroupId,
      position_direction: joggingVector,
      rotation_direction: zeroVector,
      position_velocity: velocityMmPerSec,
      rotation_velocity: 0,
      tcp: this.cartesianJoggingOpts.tcpId,
      coordinate_system: this.cartesianJoggingOpts.coordSystemId,
    })
  }

  /**
   * Start the TCP rotating around a specified axis at a given velocity
   */
  async startTCPRotation({
    axis,
    direction,
    velocityRadsPerSec,
  }: {
    axis: "x" | "y" | "z"
    direction: "-" | "+"
    velocityRadsPerSec: number
  }) {
    if (!this.cartesianWebsocket) {
      throw new Error(
        "Cartesian jogging websocket not connected; call setJoggingMode first",
      )
    }

    const zeroVector = { x: 0, y: 0, z: 0 }
    const joggingVector = Object.assign({}, zeroVector)
    joggingVector[axis] = direction === "-" ? -1 : 1

    this.cartesianWebsocket.sendJson({
      motion_group: this.motionGroupId,
      position_direction: zeroVector,
      rotation_direction: joggingVector,
      position_velocity: 0,
      rotation_velocity: velocityRadsPerSec,
      tcp: this.cartesianJoggingOpts.tcpId,
      coordinate_system: this.cartesianJoggingOpts.coordSystemId,
    })
  }
}
