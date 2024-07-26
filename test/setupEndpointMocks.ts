import { afterAll, afterEach, beforeAll } from "vitest"
import { setupServer } from "msw/node"
import { HttpResponse, http } from "msw"

const posts = [
  {
    userId: 1,
    id: 1,
    title: "first post title",
    body: "first post body",
  },
  // ...
]

export const restHandlers = [
  http.get("https://nova.mock/api/v1/cells/cell/controllers", () => {
    return HttpResponse.json(["yuh"])
  }),
]

const server = setupServer(...restHandlers)

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

//  Close server after all tests
afterAll(() => server.close())

// Reset handlers after each test `important for test isolation`
afterEach(() => server.resetHandlers())
