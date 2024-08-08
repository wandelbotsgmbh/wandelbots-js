/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../dist"

test("websocket handling", async () => {
  const nova = new NovaClient({
    instanceUrl: "https://nova.mock",
    mock: true,
  })

  // Check that we turn a path into a websocket URL correctly
  const ws = nova.openReconnectingWebsocket(
    "/motion-groups/0@mock-ur5e/state-stream",
  )
  expect(ws.url).toBe(
    "wss://nova.mock/api/v1/cells/cell/motion-groups/0@mock-ur5e/state-stream",
  )

  // Opening the same websocket again should return the same object
  const ws2 = nova.openReconnectingWebsocket(
    "/motion-groups/0@mock-ur5e/state-stream",
  )
  expect(ws2).toBe(ws)

  // Unless the websocket was disposed
  ws.dispose()
  const ws3 = nova.openReconnectingWebsocket(
    "/motion-groups/0@mock-ur5e/state-stream?tcp=foo",
  )
  expect(ws3).not.toBe(ws)
})
