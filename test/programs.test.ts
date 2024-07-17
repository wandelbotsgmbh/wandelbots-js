/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { NovaClient } from "../src"

test("running a Wandelscript program", async () => {
  const nova = new NovaClient({
    instanceUrl: "http://mock:3000",
  })

  const engine = await nova.connectWandelscriptEngine()

  const programRunner = await engine.startProgram({
    code: `move via p2p() to [1, 2, 3, 0.1, 0.2, 0.3]`,
  })

  programRunner.addEventListener("state", (state) => {})

  expect(programRunner.state.kind).toBe("starting")
})
