import {
  Configuration,
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
  VirtualRobotApi,
  VirtualRobotBehaviorApi,
  VirtualRobotModeApi,
  VirtualRobotSetupApi,
} from "@wandelbots/wandelbots-api-client"
import type { BaseAPI } from "@wandelbots/wandelbots-api-client/base"

type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : never

type UnwrapAxiosResponseReturn<T extends (...a: any) => any> = (
  ...a: Parameters<T>
) => Promise<Awaited<ReturnType<T>>["data"]>

export type WithCellId<T> = {
  [P in keyof T]: UnwrapAxiosResponseReturn<OmitFirstArg<T[P]>>
}

/**
 * API client providing type-safe access to all the Nova API REST endpoints
 * associated with a specific cell id.
 */
export class NovaCellAPIClient {
  constructor(
    readonly cellId: string,
    readonly opts: Configuration & { mock?: boolean },
  ) {}

  /**
   * Some TypeScript sorcery which alters the API class methods so you don't
   * have to pass the cell id to every single one, and de-encapsulates the
   * response data
   */
  private withCellId<T extends BaseAPI>(
    ApiConstructor: new (config: Configuration) => T,
  ) {
    const apiClient = new ApiConstructor(this.opts) as {
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

  readonly motionGroupJogging = this.withCellId(MotionGroupJoggingApi)

  readonly virtualRobot = this.withCellId(VirtualRobotApi)
  readonly virtualRobotSetup = this.withCellId(VirtualRobotSetupApi)
  readonly virtualRobotMode = this.withCellId(VirtualRobotModeApi)
  readonly virtualRobotBehavior = this.withCellId(VirtualRobotBehaviorApi)

  readonly libraryProgramMetadata = this.withCellId(LibraryProgramMetadataApi)
  readonly libraryProgram = this.withCellId(LibraryProgramApi)
  readonly libraryRecipeMetadata = this.withCellId(LibraryRecipeMetadataApi)
  readonly libraryRecipe = this.withCellId(LibraryRecipeApi)
}
