/// <reference types="vite/client" />

import { test } from "vitest"
import { NovaClient } from "../dist"

test("motion stream", async () => {
  const nova = new NovaClient({
    instanceUrl: "https://nova.mock",
  })

  const motionStream = await nova.connectMotionStream("0@mock-ur5e")
})
