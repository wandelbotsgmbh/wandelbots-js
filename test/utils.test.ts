/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { poseToWandelscriptString } from "../dist"

test("utility functions", async () => {
  expect(
    poseToWandelscriptString({
      position: { x: 1, y: 2, z: 3 },
      orientation: { x: 4, y: 5, z: 6 },
    }),
  ).toBe("[1, 2, 3, 4, 5, 6]")
})
