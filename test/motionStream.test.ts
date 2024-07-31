/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../dist"

test("motion stream", async () => {
  const nova = new NovaClient({
    instanceUrl: "https://nova.mock",
    mock: true,
  })

  const motionStream = await nova.connectMotionStream("0@mock-ur5e")
  expect(motionStream.joints.length).toBe(6)
})
