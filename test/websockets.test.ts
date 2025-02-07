/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../dist"

test("websocket handling", async () => {
  const cell = new NovaClient({
    instanceUrl: "https://mock.example.com",
  }).cell("cell")

  // Check that we turn a path into a websocket URL correctly
  const ws = cell.openReconnectingWebsocket(
    "/motion-groups/0@mock-ur5e/state-stream",
  )
  expect(ws.url).toBe(
    "wss://mock.example.com/api/v1/cells/cell/motion-groups/0@mock-ur5e/state-stream",
  )
})
