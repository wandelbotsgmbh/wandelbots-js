/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { createNovaClient } from "../src"

test("running a Wandelscript program", async () => {
  const nova = createNovaClient({
    instanceUrl: import.meta.env.NOVA_INSTANCE_URL,
    cellId: "cell",
  })

  const devices = await nova.api.deviceConfig.listDevices()
  expect(devices.length).toBeGreaterThan(0)
})
