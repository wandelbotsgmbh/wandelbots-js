/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../dist"

test("things compile and initialize", async () => {
  const nova = new NovaClient({
    instanceUrl: "https://mock.example.com",
  })

  const cell = nova.cell("cell")

  expect(cell.cellId).toBe("cell")

  await cell.api.controller.listControllers()
})
