/// <reference types="vite/client" />

import * as apis from "@wandelbots/wandelbots-api-client"
import { expect, test } from "vitest"
import { NovaClient } from "../dist"

test("api client wraps all underlying endpoints", async () => {
  const nova = new NovaClient({
    instanceUrl: "https://mock.example.com",
  })

  const wrappedApis = Object.values(nova.api)
    .map((api) => api.constructor?.name)
    .filter((name) => name && name.endsWith("Api"))
    .sort()

  const knownApis = Object.keys(apis)
    .filter((name) => name && name.endsWith("Api"))
    .sort()

  expect(knownApis).toEqual(wrappedApis)
})
