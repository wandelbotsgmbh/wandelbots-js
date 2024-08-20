/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../dist"

test("things compile and initialize", async () => {
  const nova = new NovaClient({
    instanceUrl: "https://mock.example.com",
  })

  expect(nova.config.cellId).toBe("cell")

  const result = await nova.api.controller.listControllers()
})
