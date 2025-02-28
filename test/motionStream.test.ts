/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { v1 } from "../dist/index"

test("motion stream", async () => {
  const nova = new v1.NovaClient({
    instanceUrl: "https://mock.example.com",
  })

  const motionStream = await nova.connectMotionStream("0@mock-ur5e")
  expect(motionStream.joints.length).toBe(6)

  // Test changing the url
  motionStream.motionStateSocket.changeUrl(
    nova.makeWebsocketURL("/motion-groups/0@mock-ur5e/state-stream?tcp=foo"),
  )

  await motionStream.motionStateSocket.firstMessage()

  expect(motionStream.motionStateSocket.url).toBe(
    "wss://mock.example.com/api/v1/cells/cell/motion-groups/0@mock-ur5e/state-stream?tcp=foo",
  )
})
