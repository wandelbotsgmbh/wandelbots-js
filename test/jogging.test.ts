/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { v1 } from "../dist/index"

test("jogging", async () => {
  const nova = new v1.NovaClient({
    instanceUrl: "https://mock.example.com",
  })

  const jogger = await nova.connectJogger("0@mock-ur5e")

  jogger.setJoggingMode("cartesian", {
    tcpId: "tcp",
    coordSystemId: "world",
  })

  const oldWebsocket = jogger.activeWebsocket

  // Test that jogger reopens websocket when cartesian opts change
  jogger.setJoggingMode("cartesian", {
    tcpId: "tcp",
    coordSystemId: "base",
  })

  const newWebsocket = jogger.activeWebsocket
  expect(newWebsocket).not.toBe(oldWebsocket)
})
