import type { NovaClientConfig } from "./NovaClient"
import { NovaClient } from "./NovaClient"
export * from "./NovaClient"
export * from "@wandelbots/wandelbots-api-client"
export { ConnectedMotionGroup } from "./lib/ConnectedMotionGroup"
export { ProgramStateConnection } from "./lib/ProgramStateConnection"
export { makeErrorMessage } from "./lib/util/errorHandling"

export function createNovaClient(config: NovaClientConfig) {
  return new NovaClient(config)
}
