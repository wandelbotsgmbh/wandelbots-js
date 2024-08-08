import ReconnectingWebSocket, { type ErrorEvent } from "reconnecting-websocket"
import type { MockNovaInstance } from "../mock/MockNovaInstance"

export class AutoReconnectingWebsocket extends ReconnectingWebSocket {
  receivedFirstMessage?: MessageEvent
  targetUrl: string
  disposed = false

  constructor(
    targetUrl: string,
    readonly opts: { mock?: MockNovaInstance } = {},
  ) {
    console.log("Opening websocket to", targetUrl)

    super(() => this.targetUrl || targetUrl, undefined, {
      startClosed: true,
    })

    // Reconnecting websocket doesn't set this properly with startClosed
    Object.defineProperty(this, "url", {
      get() {
        return this.targetUrl
      },
    })

    this.targetUrl = targetUrl

    this.addEventListener("open", () => {
      console.log(`Websocket to ${this.url} opened`)
    })

    this.addEventListener("message", (ev) => {
      if (!this.receivedFirstMessage) {
        this.receivedFirstMessage = ev
      }
    })

    this.addEventListener("close", () => {
      console.log(`Websocket to ${this.url} closed`)
    })

    const origReconnect = this.reconnect
    this.reconnect = () => {
      if (this.opts.mock) {
        this.opts.mock.handleWebsocketConnection(this)
      } else {
        origReconnect.apply(this)
      }
    }

    this.reconnect()
  }

  changeUrl(targetUrl: string) {
    this.receivedFirstMessage = undefined
    this.targetUrl = targetUrl
    this.reconnect()
  }

  sendJson(data: unknown) {
    if (this.opts.mock) {
      this.opts.mock.handleWebsocketMessage(this, JSON.stringify(data))
    } else {
      this.send(JSON.stringify(data))
    }
  }

  /**
   * Permanently close this websocket and indicate that
   * this object should not be used again.
   **/
  dispose() {
    this.close()
    this.disposed = true
    this.dispatchEvent(new Event("dispose"))
  }

  /**
   * Returns a promise that resolves when the first message
   * is received from the websocket. Resolves immediately if
   * the first message has already been received.
   */
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

  /**
   * Returns a promise that resolves when the next message
   * is received from the websocket.
   */
  async nextMessage() {
    return new Promise<MessageEvent>((resolve, reject) => {
      const onMessage = (ev: MessageEvent) => {
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
