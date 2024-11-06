/// <reference types="vite/client" />

import { expect, test } from "vitest"
import { poseToWandelscriptString } from "../dist"

test("pose string has right precision", async () => {
  expect(
    poseToWandelscriptString({
      position: { x: 1, y: 2, z: 3 },
      orientation: { x: 4, y: 5, z: 6 },
    }),
  ).toBe("(1.0, 2.0, 3.0, 4.0000, 5.0000, 6.0000)")
})

test("pose string rounds correctly", async () => {
  expect(
    poseToWandelscriptString({
      position: { x: 1, y: 2.22, z: 3.556 },
      orientation: { x: 2, y: 3.3333, z: 1.55559 },
    }),
  ).toBe("(1.0, 2.2, 3.6, 2.0000, 3.3333, 1.5556)")
})
