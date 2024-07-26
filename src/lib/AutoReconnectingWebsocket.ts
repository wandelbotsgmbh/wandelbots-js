import ReconnectingWebSocket, { type ErrorEvent } from "reconnecting-websocket"
import { makeURLForWebSocket } from "./websocket"

export class AutoReconnectingWebsocket extends ReconnectingWebSocket {
  receivedFirstMessage?: MessageEvent

  constructor(url: string) {
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

    this.reconnect()
  }

  sendJson(data: unknown) {
    this.send(JSON.stringify(data))
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
