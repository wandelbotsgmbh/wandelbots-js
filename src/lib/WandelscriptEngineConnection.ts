import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { tryParseJson } from "./converters"
import type { NovaClient } from "../NovaClient"
import {
  ProgramRunnerConnection,
  ProgramRunnerOpts,
} from "./ProgramRunnerConnection"

/**
 * Interface for running Wandelscript programs on the Nova instance and
 * tracking their progress and output. Wraps a websocket connection to the
 * program state stream.
 */
export class WandelscriptEngineConnection {
  programStateSocket: AutoReconnectingWebsocket

  trackedPrograms: ProgramRun[] = []

  constructor(readonly nova: NovaClient) {
    this.programStateSocket = new AutoReconnectingWebsocket(`
      ${nova.config.instanceUrl}/cells/${nova.config.cellId}/programs/state
    `)

    this.programStateSocket.addEventListener("message", (ev) => {
      const msg = tryParseJson(ev.data)

      if (!msg) {
        console.error("Failed to parse program state message", ev.data)
        return
      }

      // Send the message to the correct ProgramRun
      const program = this.trackedPrograms.find(
        (p) => p.programRunner?.id === msg.program_id,
      )
      if (program) {
        program.handleProgramStateMessage(msg)
      }
    })
  }

  async runProgram(opts: ProgramRunnerOpts) {
    const programRun = new ProgramRunnerConnection(this, opts)
    this.trackedPrograms.push(programRun)
    await programRun.start()
    return programRun
  }
}
