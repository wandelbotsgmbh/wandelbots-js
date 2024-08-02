import { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios"
import type { AutoReconnectingWebsocket } from "../lib/AutoReconnectingWebsocket"
import * as pathToRegexp from "path-to-regexp"
import {
  ControllerInstanceList,
  MotionGroupSpecification,
  MotionGroupStateResponse,
} from "@wandelbots/wandelbots-api-client"

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
    const path = "/cells" + config.url?.split("/cells")[1].split("?")[0]

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
  } satisfies MotionGroupStateResponse,
}
