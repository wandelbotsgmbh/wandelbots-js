import { expect, test } from "vitest"
import { NovaClient } from "../src"
// TODO - jogging test

test("client instantiation", () => {
  const nova = new NovaClient({
    instanceUrl: "http://localhost:3000",
    cellId: "cell",
  })

  expect(nova).toBeTruthy()
})
