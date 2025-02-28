/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../dist/lib/v1/NovaClient"

test("things compile and initialize", async () => {
  const nova = new NovaClient({
    instanceUrl: "https://mock.example.com",
  })

  expect(nova.config.cellId).toBe("cell")

  await nova.api.controller.listControllers()
})
