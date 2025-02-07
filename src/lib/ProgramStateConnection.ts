import { AxiosError } from "axios"
import { makeAutoObservable, runInAction } from "mobx"
import { AutoReconnectingWebsocket } from "./AutoReconnectingWebsocket"
import { tryParseJson } from "./converters"
import type { MotionStreamConnection } from "./MotionStreamConnection"
import { NovaCellClient } from "./NovaCellClient"

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
  type: string
  runner: {
    id: string
    state: ProgramState
    start_time?: number | null
    execution_time?: number | null
  }
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

  constructor(readonly cell: NovaCellClient) {
    makeAutoObservable(this, {}, { autoBind: true })

    this.programStateSocket = cell.openReconnectingWebsocket(`/programs/state`)

    this.programStateSocket.addEventListener("message", (ev) => {
      const msg = tryParseJson(ev.data)

      if (!msg) {
        console.error("Failed to parse program state message", ev.data)
        return
      }
      if (msg.type === "update") {
        this.handleProgramStateMessage(msg)
      }
    })
  }

  /** Handle a program state update from the backend */
  async handleProgramStateMessage(msg: ProgramStateMessage) {
    const { runner } = msg

    // Ignoring other programs for now
    // TODO - show if execution state is busy from another source
    if (runner.id !== this.currentlyExecutingProgramRunnerId) return

    if (runner.state === ProgramState.Failed) {
      try {
        const runnerState = await this.cell.api.program.getProgramRunner(
          runner.id,
        )

        // TODO - wandelengine should send print statements in real time over
        // websocket as well, rather than at the end
        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }
        this.logError(
          `Program runner ${runner.id} failed with error: ${runnerState.error}\n${runnerState.traceback}`,
        )
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${runner.id}: ${err}`,
        )
      }

      this.currentProgram.state = ProgramState.Failed

      this.gotoIdleState()
    } else if (runner.state === ProgramState.Stopped) {
      try {
        const runnerState = await this.cell.api.program.getProgramRunner(
          runner.id,
        )

        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }

        this.currentProgram.state = ProgramState.Stopped
        this.log(`Program runner ${runner.id} stopped`)
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${runner.id}: ${err}`,
        )
      }

      this.gotoIdleState()
    } else if (runner.state === ProgramState.Completed) {
      try {
        const runnerState = await this.cell.api.program.getProgramRunner(
          runner.id,
        )

        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }
        this.log(
          `Program runner ${runner.id} finished successfully in ${runner.execution_time?.toFixed(2)} seconds`,
        )

        this.currentProgram.state = ProgramState.Completed
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${runner.id}: ${err}`,
        )
      }

      this.gotoIdleState()
    } else if (runner.state === ProgramState.Running) {
      this.currentProgram.state = ProgramState.Running
      this.log(`Program runner ${runner.id} now running`)
    } else if (runner.state !== ProgramState.NotStarted) {
      console.error(runner)
      this.logError(
        `Program runner ${runner.id} entered unexpected state: ${runner.state}`,
      )
      this.currentProgram.state = ProgramState.NotStarted
      this.gotoIdleState()
    }
  }

  /** Call when a program is no longer executing */
  gotoIdleState() {
    runInAction(() => {
      this.executionState = "idle"
    })
    this.currentlyExecutingProgramRunnerId = null
  }

  async executeProgram(
    wandelscript: string,
    initial_state?: Object,
    activeRobot?: MotionStreamConnection,
  ) {
    this.currentProgram = {
      wandelscript: wandelscript,
      state: ProgramState.NotStarted,
    }

    const { currentProgram: openProgram } = this
    if (!openProgram) return
    runInAction(() => {
      this.executionState = "starting"
    })

    // Jogging can cause program execution to fail for some time after
    // So we need to explicitly stop jogging before running a program
    if (activeRobot) {
      try {
        await this.cell.api.motionGroupJogging.stopJogging(
          activeRobot.motionGroupId,
        )
      } catch (err) {
        console.error(err)
      }
    }

    // WOS-1539: Wandelengine parser currently breaks if there are empty lines with indentation
    const trimmedCode = openProgram.wandelscript!.replaceAll(/^\s*$/gm, "")

    try {
      const programRunnerRef = await this.cell.api.program.createProgramRunner(
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
      runInAction(() => {
        this.executionState = "executing"
      })
      this.currentlyExecutingProgramRunnerId = programRunnerRef.id
    } catch (error) {
      if (error instanceof AxiosError && error.response && error.request) {
        this.logError(
          `${error.response.status} ${error.response.statusText} from ${error.response.config.url} ${JSON.stringify(error.response.data)}`,
        )
      } else {
        this.logError(JSON.stringify(error))
      }
      runInAction(() => {
        this.executionState = "idle"
      })
    }
  }

  async stopProgram() {
    if (!this.currentlyExecutingProgramRunnerId) return
    runInAction(() => {
      this.executionState = "stopping"
    })

    try {
      await this.cell.api.program.stopProgramRunner(
        this.currentlyExecutingProgramRunnerId,
      )
    } catch (err) {
      // Reactivate the stop button so user can try again
      runInAction(() => {
        this.executionState = "executing"
      })
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
