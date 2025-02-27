/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../dist"

test("jogging", async () => {
  const cell = new NovaClient({
    instanceUrl: "https://mock.example.com",
  }).cell("cell")

  const jogger = await cell.connectJogger("0@mock-ur5e")

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
