/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../dist"

test("things compile and initialize", async () => {
  const nova = new NovaClient({
    instanceUrl: "https://nova.mock",
  })

  expect(nova.config.cellId).toBe("cell")

  const result = await nova.api.controller.listControllers()
  console.log(result)
})
