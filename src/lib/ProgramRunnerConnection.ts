import {
  ProgramRun,
  ProgramRunnerReference,
  ProgramRunState,
} from "@wandelbots/wandelbots-api-client"
import { WandelscriptEngineConnection } from "./WandelscriptEngineConnection"
import { AxiosError } from "axios"

export type ProgramStateMessage = {
  id: string
  state: ProgramRunState
  start_time?: number | null
  execution_time?: number | null
}

export type ProgramRunnerConnectionOpts = {
  /** The Wandelscript code to execute */
  code: string
  /** Key-value variable definitions for execution context */
  initialState?: any
  /** The default robot to run commands on, in wandelscript identifier format (motionGroupIndex_controller) e.g. universalrobots_ur5e_0 */
  defaultRobot?: string
}

export type ProgramRunLogEntry = {
  timestamp: number
  message: string
  level: "info" | "warn" | "error"
}

/** The program runner has not yet been created on the backend */
export type ProgramRunnerConnectionStateCreating = {
  kind: "creating"
  creatingPromise: Promise<ProgramRunnerReference>
}

/**
 * The program runner has been created on the backend, but we have
 * not yet received confirmation that it has started the program
 */
export type ProgramRunnerConnectionStateStarting = {
  kind: "starting"
  programRunner: ProgramRunnerReference
}

/** The program runner is currently running the program */
export type ProgramRunnerConnectionStateRunning = {
  kind: "running"
  programRunner: ProgramRunnerReference
}

/** We are currently trying to stop the program runner */
export type ProgramRunnerConnectionStateStopping = {
  kind: "stopping"
  programRunner?: ProgramRunnerReference
  stoppingPromise: Promise<void>
}

/* The program run is completed */
export type ProgramRunnerConnectionStateFinished = {
  kind: "finished"
  outcome: "success" | "failed" | "stopped"
  results: ProgramRun
}

/** There was an error communicating with the backend */
export type ProgramRunnerConnectionStateError = {
  kind: "error"
  programRunner?: ProgramRunnerReference
  error: unknown
}

export type ProgramRunnerConnectionState =
  | ProgramRunnerConnectionStateCreating
  | ProgramRunnerConnectionStateStarting
  | ProgramRunnerConnectionStateRunning
  | ProgramRunnerConnectionStateStopping
  | ProgramRunnerConnectionStateFinished
  | ProgramRunnerConnectionStateError

import { TypedEventTarget } from "typescript-event-target"

export type ProgramRunnerEventMap = {
  state: CustomEvent<ProgramRunnerConnectionState>
}

/**
 * Represents the execution of a Wandelscript program on the Nova instance.
 * Can be stopped or inspected to get the current state or log output.
 */
export class ProgramRunnerConnection extends TypedEventTarget<ProgramRunnerEventMap> {
  state: ProgramRunnerConnectionState
  logs: ProgramRunLogEntry[] = []

  get programRunner(): ProgramRunnerReference | undefined {
    return "programRunner" in this.state ? this.state.programRunner : undefined
  }

  constructor(
    readonly programState: WandelscriptEngineConnection,
    readonly opts: ProgramRunnerConnectionOpts,
  ) {
    super()
    // WOS-1539: Wandelengine parser currently breaks if there are empty lines with indentation
    const trimmedCode = this.opts.code.replaceAll(/^\s*$/gm, "")

    const creatingPromise =
      this.programState.nova.api.program.createProgramRunner(
        {
          code: trimmedCode,
          initial_state: this.opts.initialState,
          default_robot: this.opts.defaultRobot,
        } as any,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

    this.state = { kind: "creating", creatingPromise }

    const finishCreation = async () => {
      try {
        const programRunner = await creatingPromise
        this.state = { kind: "starting", programRunner }
        this.log(`Created program runner ${programRunner.id}"`)
      } catch (err) {
        this.gotoErrorState(err)
      }
    }

    finishCreation()
  }

  gotoErrorState(error: unknown) {
    if (error instanceof AxiosError && error.response && error.request) {
      this.logError(
        `${error.response.status} ${error.response.statusText} from ${error.response.config.url} ${JSON.stringify(error.response.data)}`,
      )
    } else {
      this.logError(JSON.stringify(error))
    }
    const programRunner =
      "programRunner" in this.state ? this.state.programRunner : undefined
    this.state = { kind: "error", programRunner, error }
  }

  async stop() {
    if (this.state.kind === "stopping") {
      return this.state.stoppingPromise
    }

    if (this.state.kind === "finished" || this.state.kind === "error") {
      // Already stopped
      return
    }

    let programRunner
    if (this.state.kind === "creating") {
      // Have to wait for program runner to exist before we can stop it
      try {
        programRunner = await this.state.creatingPromise
      } catch (err) {
        // Went to error state, so it stopped
        return
      }
    } else {
      programRunner = this.state.programRunner
    }

    const stoppingPromise =
      this.programState.nova.api.program.stopProgramRunner(programRunner.id)

    this.state = { kind: "stopping", programRunner, stoppingPromise }

    try {
      await stoppingPromise
    } catch (err) {
      this.gotoErrorState(err)
    }
  }

  async handleProgramStateMessage(msg: ProgramStateMessage) {
    const { nova } = this.programState

    if (msg.state === "failed") {
      try {
        const runnerState = await nova.api.program.getProgramRunner(msg.id)

        // TODO - wandelengine should send print statements in real time over
        // websocket as well, rather than at the end
        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }
        this.logError(
          `Program runner ${msg.id} failed with error: ${runnerState.error}\n${runnerState.traceback}`,
        )

        this.state = {
          kind: "finished",
          outcome: "failed",
          results: runnerState,
        }
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${msg.id}: ${err}`,
        )
        this.gotoErrorState(err)
      }
    } else if (msg.state === "stopped") {
      try {
        const runnerState = await nova.api.program.getProgramRunner(msg.id)

        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }

        this.log(`Program runner ${msg.id} stopped`)

        this.state = {
          kind: "finished",
          outcome: "stopped",
          results: runnerState,
        }
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${msg.id}: ${err}`,
        )
        this.gotoErrorState(err)
      }
    } else if (msg.state === "completed") {
      try {
        const runnerState = await nova.api.program.getProgramRunner(msg.id)

        const stdout = (runnerState as any).stdout
        if (stdout) {
          this.log(stdout)
        }
        this.log(
          `Program runner ${msg.id} finished successfully in ${msg.execution_time?.toFixed(2)} seconds`,
        )

        this.state = {
          kind: "finished",
          outcome: "success",
          results: runnerState,
        }
      } catch (err) {
        this.logError(
          `Failed to retrieve results for program ${msg.id}: ${err}`,
        )
        this.gotoErrorState(err)
      }
    } else if (msg.state === "running") {
      this.state = {
        kind: "running",
        programRunner: this.programRunner!,
      }
      this.log(`Program runner ${msg.id} now running`)
    } else if (msg.state !== "not started") {
      console.error(msg)
      this.logError(
        `Program runner ${msg.id} entered unexpected state: ${msg.state}`,
      )
      this.gotoErrorState(`Unexpected state: ${JSON.stringify(msg)}`)
    }
  }

  log(message: string) {
    console.log(message)
    this.logs.push({
      timestamp: Date.now(),
      message,
      level: "info",
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
