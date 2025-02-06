import type { AxiosRequestConfig } from "axios"
import urlJoin from "url-join"
import type { NovaClient } from "../NovaClient"
import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { ConnectedMotionGroup } from "./ConnectedMotionGroup"
import { JoggerConnection } from "./JoggerConnection"
import { MotionStreamConnection } from "./MotionStreamConnection"
import { NovaCellAPIClient } from "./NovaCellAPIClient"

/**
 * Client for connecting to a Nova instance and controlling robots.
 */
export class NovaCellClient {
  readonly api: NovaCellAPIClient

  constructor(
    readonly nova: NovaClient,
    readonly cellId: string,
  ) {
    this.api = new NovaCellAPIClient(cellId, {
      basePath: urlJoin(nova.config.instanceUrl, "/api/v1"),
      isJsonMime: (mime: string) => {
        return mime === "application/json"
      },
      baseOptions: {
        ...(nova.mock
          ? ({
              adapter: (config) => {
                return nova.mock!.handleAPIRequest(config)
              },
            } satisfies AxiosRequestConfig)
          : {}),
        ...nova.config.baseOptions,
      },
      axiosInstance: nova.axiosInstance,
    })
  }

  makeWebsocketURL(path: string): string {
    const url = new URL(
      urlJoin(
        this.nova.config.instanceUrl,
        `/api/v1/cells/${this.cellId}`,
        path,
      ),
    )
    url.protocol = url.protocol.replace("http", "ws")
    url.protocol = url.protocol.replace("https", "wss")
    // Can't set most headers on websocket requests, so we have to pass
    // the token as a query parameter
    if (this.nova.accessToken) {
      url.searchParams.append("token", this.nova.accessToken)
    }

    return url.toString()
  }

  /**
   * Retrieve an AutoReconnectingWebsocket to the given path on the Nova instance.
   * If you explicitly want to reconnect an existing websocket, call `reconnect`
   * on the returned object.
   */
  openReconnectingWebsocket(path: string) {
    return new AutoReconnectingWebsocket(this.makeWebsocketURL(path), {
      mock: this.nova.mock,
    })
  }

  /**
   * Connect to the motion state websocket(s) for a given motion group
   */
  async connectMotionStream(motionGroupId: string) {
    return await MotionStreamConnection.open(this, motionGroupId)
  }

  /**
   * Connect to the jogging websocket(s) for a given motion group
   */
  async connectJogger(motionGroupId: string) {
    return await JoggerConnection.open(this, motionGroupId)
  }

  async connectMotionGroups(
    motionGroupIds: string[],
  ): Promise<ConnectedMotionGroup[]> {
    const { instances } = await this.api.controller.listControllers()

    return Promise.all(
      motionGroupIds.map((motionGroupId) =>
        ConnectedMotionGroup.connect(this, motionGroupId, instances),
      ),
    )
  }

  async connectMotionGroup(
    motionGroupId: string,
  ): Promise<ConnectedMotionGroup> {
    const motionGroups = await this.connectMotionGroups([motionGroupId])
    return motionGroups[0]!
  }
}
