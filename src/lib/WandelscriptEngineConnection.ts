import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { tryParseJson } from "./converters"
import type { NovaClient } from "../NovaClient"
import {
  ProgramRunnerConnection,
  ProgramRunnerConnectionOpts,
} from "./ProgramRunnerConnection"

/**
 * Interface for running Wandelscript programs on the Nova instance and
 * tracking their progress and output. Wraps a websocket connection to the
 * program state stream.
 */
export class WandelscriptEngineConnection {
  programStateSocket: AutoReconnectingWebsocket

  trackedPrograms: ProgramRunnerConnection[] = []

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

      if (program.state.kind === "finished") {
        this.trackedPrograms = this.trackedPrograms.filter((p) => p !== program)
      }
    })
  }

  async startProgram(opts: ProgramRunnerConnectionOpts) {
    const programRun = new ProgramRunnerConnection(this, opts)
    this.trackedPrograms.push(programRun)
    return programRun
  }
}
