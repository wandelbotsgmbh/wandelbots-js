import { AxiosError } from "axios"
import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { tryParseJson } from "./converters"
import type { NovaClient } from "../NovaClient"
import type { ConnectedMotionGroup } from "./ConnectedMotionGroup"

export type ProgramRunnerLogEntry = {
  timestamp: number
  message: string
  level?: "warn" | "error"
}

export enum ProgramState {
  NotStarted = "not started",
  Running = "running",
  Stopped = "stopped",
  Failed = "failed",
  Completed = "completed",
}

export type CurrentProgram = {
  id?: string
  wandelscript?: string
  state?: ProgramState
}

type ProgramStateMessage = {
  id: string
  state: ProgramState
  start_time?: number | null
  execution_time?: number | null
}

/**
 * Interface for running Wandelscript programs on the Nova instance and
 * tracking their progress and output
 */
export class ProgramStateConnection {
  currentProgram: CurrentProgram = {}
  logs: ProgramRunnerLogEntry[] = []

  executionState = "idle" as "idle" | "starting" | "executing" | "stopping"
  currentlyExecutingProgramRunnerId = null as string | null

  programStateSocket: AutoReconnectingWebsocket

  constructor(readonly nova: NovaClient) {
    this.programStateSocket = new AutoReconnectingWebsocket(`
      ${nova.getBasePath()}/cells/${nova.config.cellId}/programs/state
    `)

    this.programStateSocket.addEventListener("message", (ev) => {
      const msg = tryParseJson(ev.data)

      if (!msg) {
        console.error("Failed to parse program state message", ev.data)
        return
      }

      this.handleProgramStateMessage(msg)
    })
  }

  /** Handle a program state update from the backend */
  async handleProgramStateMessage(msg: ProgramStateMessage) {
    // Ignoring other programs for now
    // TODO - show if execution state is busy from another source
    if (msg.id !== this.currentlyExecutingProgramRunnerId) return

    if (msg.state === ProgramState.Failed) {
      try {
        const runnerState = await this.nova.api.program.getProgramRunner(msg.id)

        // TODO - wandelengine should send print statements in real time over
        // websocket as well, rather than at the end
        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }
        this.logError(
          `Program runner ${msg.id} failed with error: ${runnerState.error}\n${runnerState.traceback}`,
        )
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${msg.id}: ${err}`,
        )
      }

      this.currentProgram.state = ProgramState.Failed

      this.gotoIdleState()
    } else if (msg.state === ProgramState.Stopped) {
      try {
        const runnerState = await this.nova.api.program.getProgramRunner(msg.id)

        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }

        this.currentProgram.state = ProgramState.Stopped
        this.log(`Program runner ${msg.id} stopped`)
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${msg.id}: ${err}`,
        )
      }

      this.gotoIdleState()
    } else if (msg.state === ProgramState.Completed) {
      try {
        const runnerState = await this.nova.api.program.getProgramRunner(msg.id)

        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }
        this.log(
          `Program runner ${msg.id} finished successfully in ${msg.execution_time?.toFixed(2)} seconds`,
        )

        this.currentProgram.state = ProgramState.Completed
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${msg.id}: ${err}`,
        )
      }

      this.gotoIdleState()
    } else if (msg.state === ProgramState.Running) {
      this.currentProgram.state = ProgramState.Running
      this.log(`Program runner ${msg.id} now running`)
    } else if (msg.state !== ProgramState.NotStarted) {
      console.error(msg)
      this.logError(
        `Program runner ${msg.id} entered unexpected state: ${msg.state}`,
      )
      this.currentProgram.state = ProgramState.NotStarted
      this.gotoIdleState()
    }
  }

  /** Call when a program is no longer executing */
  gotoIdleState() {
    this.executionState = "idle"
    this.currentlyExecutingProgramRunnerId = null
  }

  async executeProgram(
    wandelscript: string,
    initial_state?: Object,
    activeRobot?: ConnectedMotionGroup,
  ) {
    this.currentProgram = {
      wandelscript: wandelscript,
      state: ProgramState.NotStarted,
    }

    const { currentProgram: openProgram } = this
    if (!openProgram) return

    this.executionState = "starting"

    // Jogging can cause program execution to fail for some time after
    // So we need to explicitly stop jogging before running a program
    if (activeRobot) {
      try {
        await this.nova.api.motionGroupJogging.stopJogging(
          activeRobot.motionGroupId,
        )
      } catch (err) {
        console.error(err)
      }
    }

    // WOS-1539: Wandelengine parser currently breaks if there are empty lines with indentation
    const trimmedCode = openProgram.wandelscript!.replaceAll(/^\s*$/gm, "")

    try {
      const programRunnerRef = await this.nova.api.program.createProgramRunner(
        {
          code: trimmedCode,
          initial_state: initial_state,
          default_robot: activeRobot?.wandelscriptIdentifier,
        } as any,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      this.log(`Created program runner ${programRunnerRef.id}"`)

      this.executionState = "executing"
      this.currentlyExecutingProgramRunnerId = programRunnerRef.id
    } catch (error) {
      if (error instanceof AxiosError && error.response && error.request) {
        this.logError(
          `${error.response.status} ${error.response.statusText} from ${error.response.config.url} ${JSON.stringify(error.response.data)}`,
        )
      } else {
        this.logError(JSON.stringify(error))
      }
      this.executionState = "idle"
    }
  }

  async stopProgram() {
    if (!this.currentlyExecutingProgramRunnerId) return

    this.executionState = "stopping"

    try {
      await this.nova.api.program.stopProgramRunner(
        this.currentlyExecutingProgramRunnerId,
      )
    } catch (err) {
      // Reactivate the stop button so user can try again
      this.executionState = "executing"
      throw err
    }
  }

  reset() {
    this.currentProgram = {}
  }

  log(message: string) {
    console.log(message)
    this.logs.push({
      timestamp: Date.now(),
      message,
    })
  }

  logError(message: string) {
    console.log(message)
    this.logs.push({
      timestamp: Date.now(),
      message,
      level: "error",
    })
  }
}
