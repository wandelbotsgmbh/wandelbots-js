import type {
  ControllerInstanceList,
  MotionGroupSpecification,
  MotionGroupStateResponse,
  RobotController,
  SafetySetup,
} from "@wandelbots/nova-api/v1"
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios"
import { AxiosError } from "axios"
import * as pathToRegexp from "path-to-regexp"
import type { AutoReconnectingWebsocket } from "../../AutoReconnectingWebsocket"

/**
 * EXPERIMENTAL
 * Ultra-simplified mock Nova server for testing stuff
 */
export class MockNovaInstance {
  readonly connections: AutoReconnectingWebsocket[] = []

  async handleAPIRequest(
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> {
    const apiHandlers = [
      {
        method: "GET",
        path: "/cells/:cellId/controllers",
        handle() {
          return {
            instances: [
              {
                controller: "mock-ur5e",
                model_name: "UniversalRobots::Controller",
                host: "mock-ur5e",
                allow_software_install_on_controller: true,
                physical_motion_groups: [
                  {
                    motion_group: "0@mock-ur5e",
                    name_from_controller: "UR5e",
                    active: false,
                    model_from_controller: "UniversalRobots_UR5e",
                  },
                ],
                has_error: false,
                error_details: "",
              },
            ],
          } satisfies ControllerInstanceList
        },
      },
      {
        method: "GET",
        path: "/cells/:cellId/controllers/:controllerId",
        handle() {
          return {
            configuration: {
              kind: "VirtualController",
              manufacturer: "universalrobots",
              position: "[0,-1.571,-1.571,-1.571,1.571,-1.571,0]",
              type: "universalrobots-ur5e",
            },
            name: "mock-ur5",
          } satisfies RobotController
        },
      },
      {
        method: "GET",
        path: "/cells/:cellId/motion-groups/:motionGroupId/specification",
        handle() {
          return {
            dh_parameters: [
              {
                alpha: 1.5707963267948966,
                theta: 0,
                a: 0,
                d: 162.25,
                reverse_rotation_direction: false,
              },
              {
                alpha: 0,
                theta: 0,
                a: -425,
                d: 0,
                reverse_rotation_direction: false,
              },
              {
                alpha: 0,
                theta: 0,
                a: -392.2,
                d: 0,
                reverse_rotation_direction: false,
              },
              {
                alpha: 1.5707963267948966,
                theta: 0,
                a: 0,
                d: 133.3,
                reverse_rotation_direction: false,
              },
              {
                alpha: -1.5707963267948966,
                theta: 0,
                a: 0,
                d: 99.7,
                reverse_rotation_direction: false,
              },
              {
                alpha: 0,
                theta: 0,
                a: 0,
                d: 99.6,
                reverse_rotation_direction: false,
              },
            ],
            mechanical_joint_limits: [
              {
                joint: "JOINTNAME_AXIS_1",
                lower_limit: -6.335545063018799,
                upper_limit: 6.335545063018799,
                unlimited: false,
              },
              {
                joint: "JOINTNAME_AXIS_2",
                lower_limit: -6.335545063018799,
                upper_limit: 6.335545063018799,
                unlimited: false,
              },
              {
                joint: "JOINTNAME_AXIS_3",
                lower_limit: -6.335545063018799,
                upper_limit: 6.335545063018799,
                unlimited: false,
              },
              {
                joint: "JOINTNAME_AXIS_4",
                lower_limit: -6.335545063018799,
                upper_limit: 6.335545063018799,
                unlimited: false,
              },
              {
                joint: "JOINTNAME_AXIS_5",
                lower_limit: -6.335545063018799,
                upper_limit: 6.335545063018799,
                unlimited: false,
              },
              {
                joint: "JOINTNAME_AXIS_6",
                lower_limit: -6.335545063018799,
                upper_limit: 6.335545063018799,
                unlimited: false,
              },
            ],
          } satisfies MotionGroupSpecification
        },
      },
      {
        method: "GET",
        path: "/cells/:cellId/motion-groups/:motionGroupId/safety-setup",
        handle() {
          return {
            safety_settings: [
              {
                safety_state: "SAFETY_NORMAL",
                settings: {
                  joint_position_limits: [
                    {
                      joint: "JOINTNAME_AXIS_1",
                      lower_limit: -2.96705961227417,
                      upper_limit: 2.96705961227417,
                      unlimited: false,
                    },
                    {
                      joint: "JOINTNAME_AXIS_2",
                      lower_limit: -1.7453292608261108,
                      upper_limit: 2.7925267219543457,
                      unlimited: false,
                    },
                    {
                      joint: "JOINTNAME_AXIS_3",
                      lower_limit: -3.3161256313323975,
                      upper_limit: 0.40142571926116943,
                      unlimited: false,
                    },
                    {
                      joint: "JOINTNAME_AXIS_4",
                      lower_limit: -3.4906585216522217,
                      upper_limit: 3.4906585216522217,
                      unlimited: false,
                    },
                    {
                      joint: "JOINTNAME_AXIS_5",
                      lower_limit: -2.4434609413146973,
                      upper_limit: 2.4434609413146973,
                      unlimited: false,
                    },
                    {
                      joint: "JOINTNAME_AXIS_6",
                      lower_limit: -4.71238899230957,
                      upper_limit: 4.71238899230957,
                      unlimited: false,
                    },
                  ],
                  joint_velocity_limits: [
                    {
                      joint: "JOINTNAME_AXIS_1",
                      limit: 3.1415927410125732,
                    },
                    {
                      joint: "JOINTNAME_AXIS_2",
                      limit: 3.1415927410125732,
                    },
                    {
                      joint: "JOINTNAME_AXIS_3",
                      limit: 3.4906585216522217,
                    },
                    {
                      joint: "JOINTNAME_AXIS_4",
                      limit: 6.108652591705322,
                    },
                    {
                      joint: "JOINTNAME_AXIS_5",
                      limit: 6.108652591705322,
                    },
                    {
                      joint: "JOINTNAME_AXIS_6",
                      limit: 6.981317043304443,
                    },
                  ],
                  joint_acceleration_limits: [],
                  joint_torque_limits: [],
                  tcp_velocity_limit: 1800,
                },
              },
            ],
            safety_zones: [
              {
                id: 1,
                priority: 0,
                geometry: {
                  compound: {
                    child_geometries: [
                      {
                        convex_hull: {
                          vertices: [
                            {
                              x: -800,
                              y: -1330,
                              z: -1820,
                            },
                            {
                              x: 1650,
                              y: -1330,
                              z: -1820,
                            },
                            {
                              x: 1650,
                              y: 1330,
                              z: -1820,
                            },
                            {
                              x: -800,
                              y: 1330,
                              z: -1820,
                            },
                          ],
                        },
                        init_pose: {
                          position: {
                            x: 0,
                            y: 0,
                            z: 0,
                          },
                          orientation: {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1,
                          },
                        },
                        id: "box",
                      },
                      {
                        convex_hull: {
                          vertices: [
                            {
                              x: -800,
                              y: -1330,
                              z: -1820,
                            },
                            {
                              x: 1650,
                              y: -1330,
                              z: -1820,
                            },
                            {
                              x: 1650,
                              y: -1330,
                              z: 1500,
                            },
                            {
                              x: -800,
                              y: -1330,
                              z: 1500,
                            },
                          ],
                        },
                        init_pose: {
                          position: {
                            x: 0,
                            y: 0,
                            z: 0,
                          },
                          orientation: {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1,
                          },
                        },
                        id: "box",
                      },
                      {
                        convex_hull: {
                          vertices: [
                            {
                              x: -800,
                              y: -1330,
                              z: -1820,
                            },
                            {
                              x: -800,
                              y: 1330,
                              z: -1820,
                            },
                            {
                              x: -800,
                              y: 1330,
                              z: 1500,
                            },
                            {
                              x: -800,
                              y: -1330,
                              z: 1500,
                            },
                          ],
                        },
                        init_pose: {
                          position: {
                            x: 0,
                            y: 0,
                            z: 0,
                          },
                          orientation: {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1,
                          },
                        },
                        id: "box",
                      },
                      {
                        convex_hull: {
                          vertices: [
                            {
                              x: 1650,
                              y: 1330,
                              z: 1500,
                            },
                            {
                              x: -800,
                              y: 1330,
                              z: 1500,
                            },
                            {
                              x: -800,
                              y: -1330,
                              z: 1500,
                            },
                            {
                              x: 1650,
                              y: -1330,
                              z: 1500,
                            },
                          ],
                        },
                        init_pose: {
                          position: {
                            x: 0,
                            y: 0,
                            z: 0,
                          },
                          orientation: {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1,
                          },
                        },
                        id: "box",
                      },
                      {
                        convex_hull: {
                          vertices: [
                            {
                              x: 1650,
                              y: 1330,
                              z: 1500,
                            },
                            {
                              x: -800,
                              y: 1330,
                              z: 1500,
                            },
                            {
                              x: -800,
                              y: 1330,
                              z: -1820,
                            },
                            {
                              x: 1650,
                              y: 1330,
                              z: -1820,
                            },
                          ],
                        },
                        init_pose: {
                          position: {
                            x: 0,
                            y: 0,
                            z: 0,
                          },
                          orientation: {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1,
                          },
                        },
                        id: "box",
                      },
                      {
                        convex_hull: {
                          vertices: [
                            {
                              x: 1650,
                              y: 1330,
                              z: 1500,
                            },
                            {
                              x: 1650,
                              y: -1330,
                              z: 1500,
                            },
                            {
                              x: 1650,
                              y: -1330,
                              z: -1820,
                            },
                            {
                              x: 1650,
                              y: 1330,
                              z: -1820,
                            },
                          ],
                        },
                        init_pose: {
                          position: {
                            x: 0,
                            y: 0,
                            z: 0,
                          },
                          orientation: {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1,
                          },
                        },
                        id: "box",
                      },
                    ],
                  },
                  init_pose: {
                    position: {
                      x: 0,
                      y: 0,
                      z: 0,
                    },
                    orientation: {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
                  },
                  id: "Cell workzone",
                },
                motion_group_uid: 1,
              },
              {
                id: 2,
                priority: 0,
                geometry: {
                  convex_hull: {
                    vertices: [
                      {
                        x: 1650,
                        y: 1330,
                        z: -1850,
                      },
                      {
                        x: 865,
                        y: 1330,
                        z: -1850,
                      },
                      {
                        x: 865,
                        y: -720,
                        z: -1850,
                      },
                      {
                        x: 1650,
                        y: -720,
                        z: -1850,
                      },
                      {
                        x: 1650,
                        y: 1330,
                        z: -920,
                      },
                      {
                        x: 865,
                        y: 1330,
                        z: -920,
                      },
                      {
                        x: 865,
                        y: -720,
                        z: -920,
                      },
                      {
                        x: 1650,
                        y: -720,
                        z: -920,
                      },
                    ],
                  },
                  init_pose: {
                    position: {
                      x: 0,
                      y: 0,
                      z: 0,
                    },
                    orientation: {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
                  },
                  id: "Transport",
                },
                motion_group_uid: 1,
              },
              {
                id: 3,
                priority: 0,
                geometry: {
                  convex_hull: {
                    vertices: [
                      {
                        x: 1650,
                        y: 1330,
                        z: -600,
                      },
                      {
                        x: 865,
                        y: 1330,
                        z: -600,
                      },
                      {
                        x: 865,
                        y: 430,
                        z: -600,
                      },
                      {
                        x: 1650,
                        y: 430,
                        z: -600,
                      },
                      {
                        x: 1650,
                        y: 1330,
                        z: -1250,
                      },
                      {
                        x: 865,
                        y: 1330,
                        z: -1250,
                      },
                      {
                        x: 865,
                        y: 430,
                        z: -1250,
                      },
                      {
                        x: 1650,
                        y: 430,
                        z: -1250,
                      },
                    ],
                  },
                  init_pose: {
                    position: {
                      x: 0,
                      y: 0,
                      z: 0,
                    },
                    orientation: {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
                  },
                  id: "Tunel",
                },
                motion_group_uid: 1,
              },
              {
                id: 4,
                priority: 0,
                geometry: {
                  convex_hull: {
                    vertices: [
                      {
                        x: 1650,
                        y: -760,
                        z: -440,
                      },
                      {
                        x: 900,
                        y: -760,
                        z: -440,
                      },
                      {
                        x: 900,
                        y: -1330,
                        z: -440,
                      },
                      {
                        x: 1650,
                        y: -1330,
                        z: -440,
                      },
                      {
                        x: 1650,
                        y: -760,
                        z: -1800,
                      },
                      {
                        x: 900,
                        y: -760,
                        z: -1800,
                      },
                      {
                        x: 900,
                        y: -1330,
                        z: -1800,
                      },
                      {
                        x: 1650,
                        y: -1330,
                        z: -1800,
                      },
                    ],
                  },
                  init_pose: {
                    position: {
                      x: 0,
                      y: 0,
                      z: 0,
                    },
                    orientation: {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
                  },
                  id: "Fanuc controller",
                },
                motion_group_uid: 1,
              },
              {
                id: 6,
                priority: 0,
                geometry: {
                  convex_hull: {
                    vertices: [
                      {
                        x: -200,
                        y: -200,
                        z: -1900,
                      },
                      {
                        x: 200,
                        y: -200,
                        z: -1900,
                      },
                      {
                        x: 200,
                        y: 200,
                        z: -1900,
                      },
                      {
                        x: -200,
                        y: 200,
                        z: -1900,
                      },
                      {
                        x: -200,
                        y: -200,
                        z: -350,
                      },
                      {
                        x: 200,
                        y: -200,
                        z: -350,
                      },
                      {
                        x: 200,
                        y: 200,
                        z: -350,
                      },
                      {
                        x: -200,
                        y: 200,
                        z: -350,
                      },
                    ],
                  },
                  init_pose: {
                    position: {
                      x: 0,
                      y: 0,
                      z: 0,
                    },
                    orientation: {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
                  },
                  id: "Robot base",
                },
                motion_group_uid: 1,
              },
            ],
            robot_model_geometries: [
              {
                link_index: 1,
                geometry: {
                  sphere: {
                    radius: 270,
                  },
                  init_pose: {
                    position: {
                      x: -70,
                      y: -70,
                      z: -50,
                    },
                    orientation: {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
                  },
                  id: "link1_sphere",
                },
              },
              {
                link_index: 2,
                geometry: {
                  capsule: {
                    radius: 160,
                    cylinder_height: 800,
                  },
                  init_pose: {
                    position: {
                      x: -450,
                      y: 40,
                      z: 170,
                    },
                    orientation: {
                      x: 0,
                      y: -0.7071067811865475,
                      z: 0,
                      w: 0.7071067811865476,
                    },
                  },
                  id: "link2_capsule",
                },
              },
              {
                link_index: 3,
                geometry: {
                  sphere: {
                    radius: 270,
                  },
                  init_pose: {
                    position: {
                      x: -110,
                      y: 10,
                      z: -100,
                    },
                    orientation: {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
                  },
                  id: "link3_sphere",
                },
              },
              {
                link_index: 4,
                geometry: {
                  capsule: {
                    radius: 110,
                    cylinder_height: 600,
                  },
                  init_pose: {
                    position: {
                      x: 0,
                      y: 300,
                      z: 40,
                    },
                    orientation: {
                      x: -0.7071067811865475,
                      y: 0,
                      z: 0,
                      w: 0.7071067811865476,
                    },
                  },
                  id: "link4_capsule",
                },
              },
              {
                link_index: 5,
                geometry: {
                  sphere: {
                    radius: 75,
                  },
                  init_pose: {
                    position: {
                      x: 0,
                      y: 0,
                      z: -50,
                    },
                    orientation: {
                      x: 0,
                      y: 0,
                      z: 0,
                      w: 1,
                    },
                  },
                  id: "link5_sphere",
                },
              },
            ],
            tool_geometries: [],
          } satisfies SafetySetup
        },
      },
      {
        method: "GET",
        path: "/cells/:cellId/coordinate-systems",
        handle() {
          return {
            coordinatesystems: [
              {
                coordinate_system: "",
                name: "world",
                reference_uid: "",
                position: {
                  x: 0,
                  y: 0,
                  z: 0,
                },
                rotation: {
                  angles: [0, 0, 0],
                  type: "ROTATION_VECTOR",
                },
              },
            ],
          } //satisfies CoordinateSystems
        },
      },
      {
        method: "GET",
        path: "/cells/:cellId/motion-groups/:motionGroupId/tcps",
        handle() {
          return {
            tcps: [
              {
                id: "Flange",
                readable_name: "Default-Flange",
                position: {
                  x: 0,
                  y: 0,
                  z: 0,
                },
                rotation: {
                  angles: [0, 0, 0, 0],
                  type: "ROTATION_VECTOR",
                },
              },
              {
                id: "complex-tcp-position",
                readable_name: "Complex TCP Position",
                position: {
                  x: -200,
                  y: 300,
                  z: 150,
                },
                rotation: {
                  angles: [
                    -0.12139440409113832, -0.06356210998212003,
                    -0.2023240068185639, 0,
                  ],
                  type: "ROTATION_VECTOR",
                },
              },
            ],
          }
        },
      },
    ]

    const method = config.method?.toUpperCase() || "GET"
    const path = "/cells" + config.url?.split("/cells")[1]?.split("?")[0]

    for (const handler of apiHandlers) {
      const match = pathToRegexp.match(handler.path)(path || "")
      if (method === handler.method && match) {
        const json = handler.handle()
        return {
          status: 200,
          statusText: "Success",
          data: JSON.stringify(json),
          headers: {},
          config,
          request: {
            responseURL: config.url,
          },
        }
      }
    }

    throw new AxiosError(
      `No mock handler matched this request: ${method} ${path}`,
      "404",
      config,
    )

    // return {
    //   status: 404,
    //   statusText: "Not Found",
    //   data: "",
    //   headers: {},
    //   config,
    //   request: {
    //     responseURL: config.url,
    //   },
    // }
  }

  handleWebsocketConnection(socket: AutoReconnectingWebsocket) {
    this.connections.push(socket)

    setTimeout(() => {
      socket.dispatchEvent(new Event("open"))

      console.log("Websocket connection opened from", socket.url)

      if (socket.url.includes("/state-stream")) {
        socket.dispatchEvent(
          new MessageEvent("message", {
            data: JSON.stringify(defaultMotionState),
          }),
        )
      }

      if (socket.url.includes("/move-joint")) {
        socket.dispatchEvent(
          new MessageEvent("message", {
            data: JSON.stringify({
              result: {
                motion_group: "0@ur",
                state: {
                  controller: "ur",
                  operation_mode: "OPERATION_MODE_AUTO",
                  safety_state: "SAFETY_STATE_NORMAL",
                  timestamp: "2024-09-18T12:48:26.096266444Z",
                  velocity_override: 100,
                  motion_groups: [
                    {
                      motion_group: "0@ur",
                      controller: "ur",
                      joint_position: {
                        joints: [
                          1.3492152690887451, -1.5659207105636597,
                          1.6653711795806885, -1.0991662740707397,
                          -1.829018235206604, 1.264623761177063,
                        ],
                      },
                      joint_velocity: {
                        joints: [0, 0, 0, 0, 0, 0],
                      },
                      flange_pose: {
                        position: {
                          x: 6.437331889439328,
                          y: -628.4123774830913,
                          z: 577.0569957147832,
                        },
                        orientation: {
                          x: -1.683333649797158,
                          y: -1.9783363827298732,
                          z: -0.4928031860165713,
                        },
                        coordinate_system: "",
                      },
                      tcp_pose: {
                        position: {
                          x: 6.437331889439328,
                          y: -628.4123774830913,
                          z: 577.0569957147832,
                        },
                        orientation: {
                          x: -1.683333649797158,
                          y: -1.9783363827298732,
                          z: -0.4928031860165713,
                        },
                        coordinate_system: "",
                        tcp: "Flange",
                      },
                      velocity: {
                        linear: {
                          x: 0,
                          y: 0,
                          z: 0,
                        },
                        angular: {
                          x: -0,
                          y: 0,
                          z: 0,
                        },
                        coordinate_system: "",
                      },
                      force: {
                        force: {
                          x: 0,
                          y: 0,
                          z: 0,
                        },
                        moment: {
                          x: 0,
                          y: 0,
                          z: 0,
                        },
                        coordinate_system: "",
                      },
                      joint_limit_reached: {
                        limit_reached: [
                          false,
                          false,
                          false,
                          false,
                          false,
                          false,
                        ],
                      },
                      joint_current: {
                        joints: [0, 0, 0, 0, 0, 0],
                      },
                      sequence_number: "671259",
                    },
                  ],
                  sequence_number: "671259",
                },
                movement_state: "MOVEMENT_STATE_MOVING",
              },
            }),
          }),
        )
      }

      if (socket.url.includes("/move-tcp")) {
        socket.dispatchEvent(
          new MessageEvent("message", {
            data: JSON.stringify({
              result: {
                motion_group: "0@ur",
                state: {
                  controller: "ur",
                  operation_mode: "OPERATION_MODE_AUTO",
                  safety_state: "SAFETY_STATE_NORMAL",
                  timestamp: "2024-09-18T12:43:12.188335774Z",
                  velocity_override: 100,
                  motion_groups: [
                    {
                      motion_group: "0@ur",
                      controller: "ur",
                      joint_position: {
                        joints: [
                          1.3352527618408203, -1.5659207105636597,
                          1.6653711795806885, -1.110615611076355,
                          -1.829018235206604, 1.264623761177063,
                        ],
                      },
                      joint_velocity: {
                        joints: [0, 0, 0, 0, 0, 0],
                      },
                      flange_pose: {
                        position: {
                          x: -2.763015284002938,
                          y: -630.2151479701106,
                          z: 577.524509114342,
                        },
                        orientation: {
                          x: -1.704794877102097,
                          y: -1.9722372952861567,
                          z: -0.4852079204210754,
                        },
                        coordinate_system: "",
                      },
                      tcp_pose: {
                        position: {
                          x: -2.763015284002938,
                          y: -630.2151479701106,
                          z: 577.524509114342,
                        },
                        orientation: {
                          x: -1.704794877102097,
                          y: -1.9722372952861567,
                          z: -0.4852079204210754,
                        },
                        coordinate_system: "",
                        tcp: "Flange",
                      },
                      velocity: {
                        linear: {
                          x: 0,
                          y: 0,
                          z: 0,
                        },
                        angular: {
                          x: -0,
                          y: 0,
                          z: 0,
                        },
                        coordinate_system: "",
                      },
                      force: {
                        force: {
                          x: 0,
                          y: 0,
                          z: 0,
                        },
                        moment: {
                          x: 0,
                          y: 0,
                          z: 0,
                        },
                        coordinate_system: "",
                      },
                      joint_limit_reached: {
                        limit_reached: [
                          false,
                          false,
                          false,
                          false,
                          false,
                          false,
                        ],
                      },
                      joint_current: {
                        joints: [0, 0, 0, 0, 0, 0],
                      },
                      sequence_number: "627897",
                    },
                  ],
                  sequence_number: "627897",
                },
                movement_state: "MOVEMENT_STATE_MOVING",
              },
            }),
          }),
        )
      }
    }, 10)
  }

  handleWebsocketMessage(socket: AutoReconnectingWebsocket, message: string) {
    console.log(`Received message on ${socket.url}`, message)
  }
}

const defaultMotionState = {
  result: {
    state: {
      motion_group: "0@universalrobots-ur5e",
      controller: "universalrobots-ur5e",
      joint_position: {
        joints: [
          1.1699999570846558, -1.5700000524520874, 1.3600000143051147,
          1.0299999713897705, 1.2899999618530273, 1.2799999713897705,
        ],
      },
      joint_velocity: {
        joints: [0, 0, 0, 0, 0, 0],
      },
      flange_pose: {
        position: {
          x: 1.3300010259703043,
          y: -409.2680714682808,
          z: 531.0203477065281,
        },
        orientation: {
          x: 1.7564919306270736,
          y: -1.7542521568325058,
          z: 0.7326972590614671,
        },
        coordinate_system: "",
      },
      tcp_pose: {
        position: {
          x: 1.3300010259703043,
          y: -409.2680714682808,
          z: 531.0203477065281,
        },
        orientation: {
          x: 1.7564919306270736,
          y: -1.7542521568325058,
          z: 0.7326972590614671,
        },
        coordinate_system: "",
        tcp: "Flange",
      },
      velocity: {
        linear: {
          x: 0,
          y: 0,
          z: 0,
        },
        angular: {
          x: 0,
          y: 0,
          z: 0,
        },
        coordinate_system: "",
      },
      force: {
        force: {
          x: 0,
          y: 0,
          z: 0,
        },
        moment: {
          x: 0,
          y: 0,
          z: 0,
        },
        coordinate_system: "",
      },
      joint_limit_reached: {
        limit_reached: [false, false, false, false, false, false],
      },
      joint_current: {
        joints: [0, 0, 0, 0, 0, 0],
      },
    },
    tcp_pose: {
      position: {
        x: 302.90748476115556,
        y: -152.87065869452337,
        z: 424.0454619321661,
      },
      orientation: {
        x: 2.3403056115045353,
        y: -1.1706836379431356,
        z: 0.9772511964246311,
      },
      coordinate_system: "",
      tcp: "Flange",
    },
  } satisfies MotionGroupStateResponse,
}
