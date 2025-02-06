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
  ProgramOperatorApi,
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

type UnwrapAxiosResponseReturn<T> = T extends (...a: any) => any
  ? (
      ...a: Parameters<T>
    ) => Promise<Awaited<ReturnType<T>> extends { data: infer D } ? D : never>
  : never

export type WithUnwrappedAxiosResponse<T> = {
  [P in keyof T]: UnwrapAxiosResponseReturn<T[P]>
}

/**
 * API client providing type-safe access to Nova instance API endpoints
 */
export class NovaAPIClient {
  constructor(
    readonly opts: Omit<BaseConfiguration, "isJsonMime"> & {
      axiosInstance?: AxiosInstance
      mock?: boolean
    },
  ) {}

  /**
   * Some TypeScript sorcery which alters the API class methods to
   * de-encapsulate the response data
   */
  private unwrap<T extends BaseAPI>(
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

  readonly application = this.unwrap(ApplicationApi)
  readonly cell = this.unwrap(CellApi)
  readonly controller = this.unwrap(ControllerApi)
  readonly controllerIOs = this.unwrap(ControllerIOsApi)
  readonly coordinateSystems = this.unwrap(CoordinateSystemsApi)
  readonly deviceConfiguration = this.unwrap(DeviceConfigurationApi)
  readonly libraryProgram = this.unwrap(LibraryProgramApi)
  readonly libraryProgramMetadata = this.unwrap(LibraryProgramMetadataApi)
  readonly libraryRecipe = this.unwrap(LibraryRecipeApi)
  readonly libraryRecipeMetadata = this.unwrap(LibraryRecipeMetadataApi)
  readonly motion = this.unwrap(MotionApi)
  readonly motionGroup = this.unwrap(MotionGroupApi)
  readonly motionGroupInfos = this.unwrap(MotionGroupInfosApi)
  readonly motionGroupJogging = this.unwrap(MotionGroupJoggingApi)
  readonly motionGroupKinematic = this.unwrap(MotionGroupKinematicApi)
  readonly program = this.unwrap(ProgramApi)
  readonly programOperator = this.unwrap(ProgramOperatorApi)
  readonly programValues = this.unwrap(ProgramValuesApi)
  readonly storeCollisionComponents = this.unwrap(StoreCollisionComponentsApi)
  readonly storeCollisionScenes = this.unwrap(StoreCollisionScenesApi)
  readonly storeObject = this.unwrap(StoreObjectApi)
  readonly system = this.unwrap(SystemApi)
  readonly virtualRobot = this.unwrap(VirtualRobotApi)
  readonly virtualRobotBehavior = this.unwrap(VirtualRobotBehaviorApi)
  readonly virtualRobotMode = this.unwrap(VirtualRobotModeApi)
  readonly virtualRobotSetup = this.unwrap(VirtualRobotSetupApi)
}
