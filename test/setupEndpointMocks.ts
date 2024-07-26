import { afterAll, afterEach, beforeAll } from "vitest"
import { setupServer } from "msw/node"
import { HttpResponse, http } from "msw"
import { WebSocketInterceptor } from "@mswjs/interceptors/WebSocket"
import { ControllerInstanceList } from "@wandelbots/wandelbots-api-client"

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
    console.log("Got connection!", socket.client.url)
    socket.server.connect()
  })

  interceptor.apply()
})
