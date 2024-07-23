import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import type {
  Command,
  Joints,
  TcpPose,
} from "@wandelbots/wandelbots-api-client"
// TODO -- see if we can eliminate this three dependency
import { Vector3 } from "three"
import { NovaClient } from "../NovaClient"
import { makeUrlQueryString } from "./converters"

export class JoggerConnection {
  // Currently a separate websocket is needed for each mode, pester API people
  // to merge these for simplicity
  cartesianWebsocket: AutoReconnectingWebsocket | null = null
  jointWebsocket: AutoReconnectingWebsocket | null = null
  cartesianJoggingOpts: {
    tcpId?: string
    coordSystemId?: string
  } = {}

  constructor(
    readonly nova: NovaClient,
    readonly config: {
      motionGroupId: string
      numJoints: number
    },
  ) {}

  get activeJoggingMode() {
    if (this.cartesianWebsocket) return "cartesian"
    if (this.jointWebsocket) return "joint"
    return "increment"
  }

  get activeWebsocket() {
    return this.cartesianWebsocket || this.jointWebsocket
  }

  dispose() {
    if (this.cartesianWebsocket) {
      this.cartesianWebsocket.close()
    }

    if (this.jointWebsocket) {
      this.jointWebsocket.close()
    }
  }

  async stop() {
    if (!this.activeWebsocket) {
      console.warn(
        "Stopping incremental jogging midway currently isn't implemented",
      )
      return
    }

    // Why not call the stopJogging API endpoint?
    // Because this results in the websocket closing and we
    // would like to keep it open for now.

    if (this.cartesianWebsocket) {
      this.cartesianWebsocket.sendJson({
        motion_group: this.config.motionGroupId,
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
        motion_group: this.config.motionGroupId,
        joint_velocities: new Array(this.config.numJoints).fill(0),
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
      const queryString = makeUrlQueryString({
        tcp: this.cartesianJoggingOpts.tcpId || "",
        coordinate_system: this.cartesianJoggingOpts.coordSystemId || "",
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
    direction: "-" | "+"
    velocityRadsPerSec: number
  }) {
    if (!this.jointWebsocket) {
      throw new Error(
        "Joint jogging websocket not connected; call setJoggingMode first",
      )
    }

    const jointVelocities = new Array(this.config.numJoints).fill(0)

    jointVelocities[joint] =
      direction === "-" ? -velocityRadsPerSec : velocityRadsPerSec

    this.jointWebsocket.sendJson({
      motion_group: this.config.motionGroupId,
      joint_velocities: jointVelocities,
    })
  }

  /**
   * Start the robot moving on a cartesian axis at the specified velocity
   * Movement can be either translation or rotation around the TCP
   */
  async startCartesianJogging({
    axis,
    direction,
    motion,
  }: {
    tcpId: string
    coordSystemId: string
    axis: "x" | "y" | "z"
    direction: "-" | "+"
    motion:
      | {
          type: "translate"
          velocityMmPerSec: number
        }
      | {
          type: "rotate"
          velocityRadsPerSec: number
        }
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
      motion_group: this.config.motionGroupId,
      position_direction:
        motion.type === "translate" ? joggingVector : zeroVector,
      rotation_direction: motion.type === "rotate" ? joggingVector : zeroVector,
      position_velocity:
        motion.type === "translate" ? motion.velocityMmPerSec : 0,
      rotation_velocity:
        motion.type === "rotate" ? motion.velocityRadsPerSec : 0,
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

    const motionPlanRes = await this.nova.api.motion.planMotion({
      motion_group: this.config.motionGroupId,
      start_joint_position: currentJoints,
      commands,
    })

    const plannedMotion = motionPlanRes.plan_successful_response?.motion
    if (!plannedMotion) {
      console.error("Failed to plan jogging increment motion", motionPlanRes)
      return
    }

    await this.nova.api.motion.streamMoveForward(
      plannedMotion,
      {
        playback_speed_in_percent: 100,
        response_coordinate_system: coordSystemId,
      },
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
    targetJoints[joint] += distanceRads * (direction === "-" ? -1 : 1)

    const jointVelocityLimits: number[] = new Array(this.config.numJoints).fill(
      velocityRadsPerSec,
    )

    const motionPlanRes = await this.nova.api.motion.planMotion({
      motion_group: this.config.motionGroupId,
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

    await this.nova.api.motion.streamMoveForward(
      plannedMotion,
      {
        playback_speed_in_percent: 100,
      },
      {
        // Might take a while at low velocity
        timeout: 1000 * 60,
      },
    )
  }
}
