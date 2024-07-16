/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../src"

test("running a Wandelscript program", async () => {
  const nova = new NovaClient({
    instanceUrl: "http://mock:3000",
  })

  const engine = await nova.connectWandelscriptEngine()

  const devices = await nova.api.deviceConfig.listDevices()
  expect(devices.length).toBeGreaterThan(0)
})
