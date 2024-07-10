import { NovaClient, NovaClientConfig } from "./NovaClient"
export * from "./NovaClient"
export * from "@wandelbots/wandelbots-api-client"

export function createNovaClient(config: NovaClientConfig) {
  return new NovaClient(config)
}
