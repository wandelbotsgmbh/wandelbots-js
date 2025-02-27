import type {
  Command,
  Joints,
  TcpPose,
} from "@wandelbots/wandelbots-api-client"
import isEqual from "lodash-es/isEqual"
import { Vector3 } from "three/src/math/Vector3.js"
import type { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { isSameCoordinateSystem, tryParseJson } from "./converters"
import type { MotionStreamConnection } from "./MotionStreamConnection"
import type { NovaCellClient } from "./NovaCellClient"

export type JoggerConnectionOpts = {
  /**
   * When an error message is received from the jogging websocket, it
   * will be passed here. If this handler is not provided, the error will
   * instead be thrown as an unhandled error.
   */
  onError?: (err: unknown) => void
}

export class JoggerConnection {
  // Currently a separate websocket is needed for each mode, pester API people
  // to merge these for simplicity
  cartesianWebsocket: AutoReconnectingWebsocket | null = null
  jointWebsocket: AutoReconnectingWebsocket | null = null
  cartesianJoggingOpts: {
    tcpId?: string
    coordSystemId?: string
  } = {}

  static async open(
    cell: NovaCellClient,
    motionGroupId: string,
    opts: JoggerConnectionOpts = {},
  ) {
    const motionStream = await cell.connectMotionStream(motionGroupId)

    return new JoggerConnection(motionStream, opts)
  }

  constructor(
    readonly motionStream: MotionStreamConnection,
    readonly opts: JoggerConnectionOpts = {},
  ) {}

  get motionGroupId() {
    return this.motionStream.motionGroupId
  }

  get cell() {
    return this.motionStream.cell
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

  dispose() {
    if (this.cartesianWebsocket) {
      this.cartesianWebsocket.dispose()
    }

    if (this.jointWebsocket) {
      this.jointWebsocket.dispose()
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
      // Websocket needs to be reopened to change options
      if (!isEqual(this.cartesianJoggingOpts, cartesianJoggingOpts)) {
        if (this.cartesianWebsocket) {
          this.cartesianWebsocket.dispose()
          this.cartesianWebsocket = null
        }
      }

      this.cartesianJoggingOpts = cartesianJoggingOpts
    }

    if (mode !== "cartesian" && this.cartesianWebsocket) {
      this.cartesianWebsocket.dispose()
      this.cartesianWebsocket = null
    }

    if (mode !== "joint" && this.jointWebsocket) {
      this.jointWebsocket.dispose()
      this.jointWebsocket = null
    }

    if (mode === "cartesian" && !this.cartesianWebsocket) {
      this.cartesianWebsocket = this.cell.openReconnectingWebsocket(
        `/motion-groups/move-tcp`,
      )

      this.cartesianWebsocket.addEventListener(
        "message",
        (ev: MessageEvent) => {
          const data = tryParseJson(ev.data)
          if (data && "error" in data) {
            if (this.opts.onError) {
              this.opts.onError(ev.data)
            } else {
              throw new Error(ev.data)
            }
          }
        },
      )
    }

    if (mode === "joint" && !this.jointWebsocket) {
      this.jointWebsocket = this.cell.openReconnectingWebsocket(
        `/motion-groups/move-joint`,
      )

      this.jointWebsocket.addEventListener("message", (ev: MessageEvent) => {
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

  /**
   * Move the robot by a fixed distance in a single cartesian
   * axis, either rotating or translating relative to the TCP.
   * Promise resolves only after the motion has completed.
   */
  async runIncrementalCartesianMotion({
    currentTcpPose,
    currentJoints,
    coordSystemId,
    velocityInRelevantUnits,
    axis,
    direction,
    motion,
  }: {
    currentTcpPose: TcpPose
    currentJoints: Joints
    coordSystemId: string
    velocityInRelevantUnits: number
    axis: "x" | "y" | "z"
    direction: "-" | "+"
    motion:
      | {
          type: "rotate"
          distanceRads: number
        }
      | {
          type: "translate"
          distanceMm: number
        }
  }) {
    const commands: Command[] = []

    if (
      !isSameCoordinateSystem(currentTcpPose.coordinate_system, coordSystemId)
    ) {
      throw new Error(
        `Current TCP pose coordinate system ${currentTcpPose.coordinate_system} does not match target coordinate system ${coordSystemId}`,
      )
    }

    if (motion.type === "translate") {
      const targetTcpPosition = Object.assign({}, currentTcpPose.position)
      targetTcpPosition[axis] +=
        motion.distanceMm * (direction === "-" ? -1 : 1)

      commands.push({
        settings: {
          limits_override: {
            tcp_velocity_limit: velocityInRelevantUnits,
          },
        },
        line: {
          position: targetTcpPosition,
          orientation: currentTcpPose.orientation,
          coordinate_system: coordSystemId,
        },
      })
    } else if (motion.type === "rotate") {
      // Concatenate rotations expressed by rotation vectors
      // Equations taken from https://physics.stackexchange.com/a/287819

      // Compute axis and angle of current rotation vector
      const currentRotationVector = new Vector3(
        currentTcpPose.orientation["x"],
        currentTcpPose.orientation["y"],
        currentTcpPose.orientation["z"],
      )

      const currentRotationRad = currentRotationVector.length()
      const currentRotationDirection = currentRotationVector.clone().normalize()

      // Compute axis and angle of difference rotation vector
      const differenceRotationRad =
        motion.distanceRads * (direction === "-" ? -1 : 1)

      const differenceRotationDirection = new Vector3(0.0, 0.0, 0.0)
      differenceRotationDirection[axis] = 1.0

      // Some abbreviations to make the following equations more readable
      const f1 =
        Math.cos(0.5 * differenceRotationRad) *
        Math.cos(0.5 * currentRotationRad)
      const f2 =
        Math.sin(0.5 * differenceRotationRad) *
        Math.sin(0.5 * currentRotationRad)
      const f3 =
        Math.sin(0.5 * differenceRotationRad) *
        Math.cos(0.5 * currentRotationRad)
      const f4 =
        Math.cos(0.5 * differenceRotationRad) *
        Math.sin(0.5 * currentRotationRad)

      const dotProduct = differenceRotationDirection.dot(
        currentRotationDirection,
      )

      const crossProduct = differenceRotationDirection
        .clone()
        .cross(currentRotationDirection)

      // Compute angle of concatenated rotation
      const newRotationRad = 2.0 * Math.acos(f1 - f2 * dotProduct)

      // Compute rotation vector of concatenated rotation
      const f5 = newRotationRad / Math.sin(0.5 * newRotationRad)

      const targetTcpOrientation = new Vector3()
        .addScaledVector(crossProduct, f2)
        .addScaledVector(differenceRotationDirection, f3)
        .addScaledVector(currentRotationDirection, f4)
        .multiplyScalar(f5)

      commands.push({
        settings: {
          limits_override: {
            tcp_orientation_velocity_limit: velocityInRelevantUnits,
          },
        },
        line: {
          position: currentTcpPose.position,
          orientation: targetTcpOrientation,
          coordinate_system: coordSystemId,
        },
      })
    }

    const motionPlanRes = await this.cell.api.motion.planMotion({
      motion_group: this.motionGroupId,
      start_joint_position: currentJoints,
      tcp: this.cartesianJoggingOpts.tcpId,
      commands,
    })

    const plannedMotion = motionPlanRes.plan_successful_response?.motion
    if (!plannedMotion) {
      throw new Error(
        `Failed to plan jogging increment motion ${JSON.stringify(motionPlanRes)}`,
      )
    }

    await this.cell.api.motion.streamMoveForward(
      plannedMotion,
      100,
      undefined,
      undefined,
      undefined,
      {
        // Might take a while at low velocity
        timeout: 1000 * 60,
      },
    )
  }

  /**
   * Rotate a single robot joint by a fixed number of radians
   * Promise resolves only after the motion has completed.
   */
  async runIncrementalJointRotation({
    joint,
    currentJoints,
    velocityRadsPerSec,
    direction,
    distanceRads,
  }: {
    joint: number
    currentJoints: Joints
    velocityRadsPerSec: number
    direction: "-" | "+"
    distanceRads: number
  }) {
    const targetJoints = [...currentJoints.joints]
    targetJoints[joint]! += distanceRads * (direction === "-" ? -1 : 1)

    const jointVelocityLimits: number[] = new Array(
      currentJoints.joints.length,
    ).fill(velocityRadsPerSec)

    const motionPlanRes = await this.cell.api.motion.planMotion({
      motion_group: this.motionGroupId,
      start_joint_position: currentJoints,
      commands: [
        {
          settings: {
            limits_override: {
              joint_velocity_limits: {
                joints: jointVelocityLimits,
              },
            },
          },
          joint_ptp: {
            joints: targetJoints,
          },
        },
      ],
    })

    const plannedMotion = motionPlanRes.plan_successful_response?.motion
    if (!plannedMotion) {
      console.error("Failed to plan jogging increment motion", motionPlanRes)
      return
    }

    await this.cell.api.motion.streamMoveForward(
      plannedMotion,
      100,
      undefined,
      undefined,
      undefined,
      {
        // Might take a while at low velocity
        timeout: 1000 * 60,
      },
    )
  }
}
