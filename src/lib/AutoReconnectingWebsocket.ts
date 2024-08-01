import ReconnectingWebSocket, { type ErrorEvent } from "reconnecting-websocket"
import type { MockNovaInstance } from "../mock/MockNovaInstance"

export class AutoReconnectingWebsocket extends ReconnectingWebSocket {
  receivedFirstMessage?: MessageEvent

  constructor(
    url: string,
    readonly opts: { mock?: MockNovaInstance } = {},
  ) {
    console.log("Opening websocket to", url)
    super(url, undefined, {
      startClosed: true,
    })

    this.addEventListener("open", () => {
      console.log(`Websocket to ${url} opened`)
    })

    this.addEventListener("close", () => {
      console.log(`Websocket to ${url} closed`)
    })

    const origReconnect = this.reconnect
    this.reconnect = () => {
      if (this.opts.mock) {
        this.opts.mock.handleWebsocketConnection(this)
      } else {
        this.reconnect()
      }
      origReconnect.apply(this)
    }

    this.changeUrl(url)
  }

  changeUrl(url: string) {
    // reconnecting-websocket doesn't set this properly with startClosed
    // so we do it ourselves
    Object.defineProperty(this, "url", { value: url, configurable: true })
    this.reconnect()
  }

  sendJson(data: unknown) {
    if (this.opts.mock) {
      this.opts.mock.handleWebsocketMessage(this, JSON.stringify(data))
    } else {
      this.send(JSON.stringify(data))
    }
  }

  async firstMessage() {
    if (this.receivedFirstMessage) {
      return this.receivedFirstMessage
    }

    return new Promise<MessageEvent>((resolve, reject) => {
      const onMessage = (ev: MessageEvent) => {
        this.receivedFirstMessage = ev
        this.removeEventListener("message", onMessage)
        this.removeEventListener("error", onError)
        resolve(ev)
      }

      const onError = (ev: ErrorEvent) => {
        this.removeEventListener("message", onMessage)
        this.removeEventListener("error", onError)
        reject(ev)
      }

      this.addEventListener("message", onMessage)
      this.addEventListener("error", onError)
    })
  }
}
