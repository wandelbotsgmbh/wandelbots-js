import type { Configuration as BaseConfiguration } from "@wandelbots/wandelbots-api-client"
import {
  ApplicationApi,
  CellApi,
  ControllerApi,
  ControllerIOsApi,
  CoordinateSystemsApi,
  DeviceConfigurationApi,
  LibraryProgramApi,
  LibraryProgramMetadataApi,
  LibraryRecipeApi,
  LibraryRecipeMetadataApi,
  MotionApi,
  MotionGroupApi,
  MotionGroupInfosApi,
  MotionGroupJoggingApi,
  MotionGroupKinematicApi,
  ProgramApi,
  ProgramValuesApi,
  StoreCollisionComponentsApi,
  StoreCollisionScenesApi,
  StoreObjectApi,
  SystemApi,
  VirtualRobotApi,
  VirtualRobotBehaviorApi,
  VirtualRobotModeApi,
  VirtualRobotSetupApi,
} from "@wandelbots/wandelbots-api-client"
import type { BaseAPI } from "@wandelbots/wandelbots-api-client/base"
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

  readonly deviceConfig = this.withCellId(DeviceConfigurationApi)

  readonly motionGroup = this.withCellId(MotionGroupApi)
  readonly motionGroupInfos = this.withCellId(MotionGroupInfosApi)

  readonly controller = this.withCellId(ControllerApi)

  readonly program = this.withCellId(ProgramApi)
  readonly programValues = this.withCellId(ProgramValuesApi)

  readonly controllerIOs = this.withCellId(ControllerIOsApi)

  readonly motionGroupKinematic = this.withCellId(MotionGroupKinematicApi)
  readonly motion = this.withCellId(MotionApi)

  readonly coordinateSystems = this.withCellId(CoordinateSystemsApi)

  readonly application = this.withCellId(ApplicationApi)

  readonly motionGroupJogging = this.withCellId(MotionGroupJoggingApi)

  readonly virtualRobot = this.withCellId(VirtualRobotApi)
  readonly virtualRobotSetup = this.withCellId(VirtualRobotSetupApi)
  readonly virtualRobotMode = this.withCellId(VirtualRobotModeApi)
  readonly virtualRobotBehavior = this.withCellId(VirtualRobotBehaviorApi)

  readonly libraryProgramMetadata = this.withCellId(LibraryProgramMetadataApi)
  readonly libraryProgram = this.withCellId(LibraryProgramApi)
  readonly libraryRecipeMetadata = this.withCellId(LibraryRecipeMetadataApi)
  readonly libraryRecipe = this.withCellId(LibraryRecipeApi)

  readonly storeObject = this.withCellId(StoreObjectApi)
  readonly storeCollisionComponents = this.withCellId(
    StoreCollisionComponentsApi,
  )
  readonly storeCollisionScenes = this.withCellId(StoreCollisionScenesApi)
}
