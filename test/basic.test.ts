/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { v1 } from "../dist/index"

test("things compile and initialize", async () => {
  const nova = new v1.NovaClient({
    instanceUrl: "https://mock.example.com",
  })

  expect(nova.config.cellId).toBe("cell")

  await nova.api.controller.listControllers()
})
