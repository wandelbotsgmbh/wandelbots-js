import type { Configuration as BaseConfiguration } from "@wandelbots/nova-api/v2"
import {
  ApplicationApi,
  CellApi,
  ControllerApi,
  ControllerInputsOutputsApi,
  CoordinateSystemsApi,
  JoggingApi,
  MotionGroupApi,
  MotionGroupInfoApi,
  MotionGroupKinematicsApi,
  ProgramApi,
  ProgramLibraryApi,
  ProgramLibraryMetadataApi,
  ProgramOperatorApi,
  StoreCollisionComponentsApi,
  StoreCollisionScenesApi,
  StoreObjectApi,
  SystemApi,
  TrajectoryExecutionApi,
  TrajectoryPlanningApi,
  VirtualRobotApi,
  VirtualRobotBehaviorApi,
  VirtualRobotModeApi,
  VirtualRobotSetupApi,
} from "@wandelbots/nova-api/v2"
import type { BaseAPI } from "@wandelbots/nova-api/v2/base"
import type { AxiosInstance } from "axios"
import axios from "axios"

type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : never

type UnwrapAxiosResponseReturn<T> = T extends (...a: any) => any
  ? (
      ...a: Parameters<T>
    ) => Promise<Awaited<ReturnType<T>> extends { data: infer D } ? D : never>
  : never

export type WithCellId<T> = {
  [P in keyof T]: UnwrapAxiosResponseReturn<OmitFirstArg<T[P]>>
}

export type WithUnwrappedAxiosResponse<T> = {
  [P in keyof T]: UnwrapAxiosResponseReturn<T[P]>
}

/**
 * API client providing type-safe access to all the Nova API REST endpoints
 * associated with a specific cell id.
 */
export class NovaCellAPIClient {
  constructor(
    readonly cellId: string,
    readonly opts: BaseConfiguration & {
      axiosInstance?: AxiosInstance
      mock?: boolean
    },
  ) {}

  /**
   * Some TypeScript sorcery which alters the API class methods so you don't
   * have to pass the cell id to every single one, and de-encapsulates the
   * response data
   */
  private withCellId<T extends BaseAPI>(
    ApiConstructor: new (
      config: BaseConfiguration,
      basePath: string,
      axios: AxiosInstance,
    ) => T,
  ) {
    const apiClient = new ApiConstructor(
      {
        ...this.opts,
        isJsonMime: (mime: string) => {
          return mime === "application/json"
        },
      },
      this.opts.basePath ?? "",
      this.opts.axiosInstance ?? axios.create(),
    ) as {
      [key: string | symbol]: any
    }

    for (const key of Reflect.ownKeys(Reflect.getPrototypeOf(apiClient)!)) {
      if (key !== "constructor" && typeof apiClient[key] === "function") {
        const originalFunction = apiClient[key]
        apiClient[key] = (...args: any[]) => {
          return originalFunction
            .apply(apiClient, [this.cellId, ...args])
            .then((res: any) => res.data)
        }
      }
    }

    return apiClient as WithCellId<T>
  }

  /**
   * As withCellId, but only does the response unwrapping
   */
  private withUnwrappedResponsesOnly<T extends BaseAPI>(
    ApiConstructor: new (
      config: BaseConfiguration,
      basePath: string,
      axios: AxiosInstance,
    ) => T,
  ) {
    const apiClient = new ApiConstructor(
      {
        ...this.opts,
        isJsonMime: (mime: string) => {
          return mime === "application/json"
        },
      },
      this.opts.basePath ?? "",
      this.opts.axiosInstance ?? axios.create(),
    ) as {
      [key: string | symbol]: any
    }

    for (const key of Reflect.ownKeys(Reflect.getPrototypeOf(apiClient)!)) {
      if (key !== "constructor" && typeof apiClient[key] === "function") {
        const originalFunction = apiClient[key]
        apiClient[key] = (...args: any[]) => {
          return originalFunction
            .apply(apiClient, args)
            .then((res: any) => res.data)
        }
      }
    }

    return apiClient as WithUnwrappedAxiosResponse<T>
  }

  readonly system = this.withUnwrappedResponsesOnly(SystemApi)
  readonly cell = this.withUnwrappedResponsesOnly(CellApi)

  readonly motionGroup = this.withCellId(MotionGroupApi)
  readonly motionGroupInfos = this.withCellId(MotionGroupInfoApi)

  readonly controller = this.withCellId(ControllerApi)

  readonly program = this.withCellId(ProgramApi)
  readonly programOperator = this.withCellId(ProgramOperatorApi)
  readonly programLibraryMetadata = this.withCellId(ProgramLibraryMetadataApi)
  readonly programLibrary = this.withCellId(ProgramLibraryApi)

  readonly controllerIOs = this.withCellId(ControllerInputsOutputsApi)

  readonly motionGroupKinematic = this.withCellId(MotionGroupKinematicsApi)
  readonly trajectoryPlanning = this.withCellId(TrajectoryPlanningApi)
  readonly trajectoryExecution = this.withCellId(TrajectoryExecutionApi)

  readonly coordinateSystems = this.withCellId(CoordinateSystemsApi)

  readonly application = this.withCellId(ApplicationApi)
  readonly applicationGlobal = this.withUnwrappedResponsesOnly(ApplicationApi)

  readonly jogging = this.withCellId(JoggingApi)

  readonly virtualRobot = this.withCellId(VirtualRobotApi)
  readonly virtualRobotSetup = this.withCellId(VirtualRobotSetupApi)
  readonly virtualRobotMode = this.withCellId(VirtualRobotModeApi)
  readonly virtualRobotBehavior = this.withCellId(VirtualRobotBehaviorApi)

  readonly storeObject = this.withCellId(StoreObjectApi)
  readonly storeCollisionComponents = this.withCellId(
    StoreCollisionComponentsApi,
  )
  readonly storeCollisionScenes = this.withCellId(StoreCollisionScenesApi)
}
