import { afterAll, afterEach, beforeAll } from "vitest"
import { setupServer } from "msw/node"
import { HttpResponse, http } from "msw"
import { WebSocketInterceptor } from "@mswjs/interceptors/WebSocket"
import {
  ControllerInstanceList,
  MotionGroupStateResponse,
} from "@wandelbots/wandelbots-api-client"

export const restHandlers = [
  http.get("https://nova.mock/api/v1/cells/cell/controllers", () => {
    return HttpResponse.json({
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
    } satisfies ControllerInstanceList)
  }),
]

// Adapted from https://vitest.dev/guide/mocking#requests
const server = setupServer(...restHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

// Reset handlers after each test ("important for test isolation")
afterEach(() => server.resetHandlers())

// Now for the websockets

beforeAll(() => {
  const interceptor = new WebSocketInterceptor()

  interceptor.on("connection", (socket) => {
    if (socket.client.url.pathname.endsWith("/state-stream")) {
      socket.client.send(
        JSON.stringify({
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
        }),
      )
    }
    console.log("Got connection!", socket.client.url)
  })

  interceptor.apply()
})
