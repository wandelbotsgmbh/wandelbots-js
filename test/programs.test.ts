/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../src"

test("running a Wandelscript program", async () => {
  const nova = new NovaClient({
    instanceUrl: import.meta.env.NOVA_INSTANCE_URL,
    cellId: "cell",
  })

  const devices = await nova.api.deviceConfig.listDevices()
  console.log(devices)
  expect(devices.length).toBeGreaterThan(0)
})
