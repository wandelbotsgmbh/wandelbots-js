import * as _wandelbots_wandelbots_api_client from '@wandelbots/wandelbots-api-client';
import { ControllerInstance, MotionGroupPhysical, MotionGroupState, RobotTcp, MotionGroupSpecification, Configuration, DeviceConfigurationApi, MotionGroupApi, MotionGroupInfosApi, ControllerApi, ProgramApi, ProgramValuesApi, ControllerIOsApi, MotionGroupKinematicApi, MotionApi, CoordinateSystemsApi, MotionGroupJoggingApi, VirtualRobotApi, VirtualRobotSetupApi, VirtualRobotModeApi, VirtualRobotBehaviorApi, LibraryProgramMetadataApi, LibraryProgramApi, LibraryRecipeMetadataApi, LibraryRecipeApi } from '@wandelbots/wandelbots-api-client';
export * from '@wandelbots/wandelbots-api-client';
import ReconnectingWebSocket from 'reconnecting-websocket';

declare class AutoReconnectingWebsocket extends ReconnectingWebSocket {
    receivedFirstMessage?: MessageEvent;
    path: string;
    constructor(path: string, user?: string, password?: string);
    sendJson(data: unknown): void;
    firstMessage(): Promise<MessageEvent<any>>;
}

/**
 * Store representing the current state of a connected motion group.
 */
declare class ConnectedMotionGroup {
    readonly nova: NovaClient;
    readonly controller: ControllerInstance;
    readonly motionGroup: MotionGroupPhysical;
    readonly initialMotionState: MotionGroupState;
    readonly motionStateSocket: AutoReconnectingWebsocket;
    readonly isVirtual: boolean;
    readonly tcps: RobotTcp[];
    readonly motionGroupSpecification: MotionGroupSpecification;
    static connect(nova: NovaClient, motionGroupId: string, controllers: ControllerInstance[]): Promise<ConnectedMotionGroup>;
    connectedJoggingCartesianSocket: WebSocket | null;
    connectedJoggingJointsSocket: WebSocket | null;
    planData: any | null;
    joggingVelocity: number;
    rapidlyChangingMotionState: MotionGroupState;
    constructor(nova: NovaClient, controller: ControllerInstance, motionGroup: MotionGroupPhysical, initialMotionState: MotionGroupState, motionStateSocket: AutoReconnectingWebsocket, isVirtual: boolean, tcps: RobotTcp[], motionGroupSpecification: MotionGroupSpecification);
    get motionGroupId(): string;
    get controllerId(): string;
    get modelFromController(): string | undefined;
    get wandelscriptIdentifier(): string;
    /** Jogging velocity in radians for rotation and joint movement */
    get joggingVelocityRads(): number;
    get joints(): {
        index: number;
    }[];
    get dhParameters(): _wandelbots_wandelbots_api_client.DHParameter[] | undefined;
    dispose(): void;
    setJoggingVelocity(velocity: number): void;
}

type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never;
type WithCellId<T> = {
    [P in keyof T]: OmitFirstArg<T[P]>;
};
/**
 * API client providing type-safe access to all the Nova API REST endpoints
 * associated with a specific cell id.
 */
declare class NovaCellAPIClient {
    readonly cellId: string;
    readonly config: Configuration;
    constructor(cellId: string, config: Configuration);
    /**
     * Some TypeScript sorcery which alters the API class methods so you don't
     * have to pass the cell id to every single one
     */
    private withCellId;
    readonly deviceConfig: WithCellId<DeviceConfigurationApi>;
    readonly motionGroup: WithCellId<MotionGroupApi>;
    readonly motionGroupInfos: WithCellId<MotionGroupInfosApi>;
    readonly controller: WithCellId<ControllerApi>;
    readonly program: WithCellId<ProgramApi>;
    readonly programValues: WithCellId<ProgramValuesApi>;
    readonly controllerIOs: WithCellId<ControllerIOsApi>;
    readonly motionGroupKinematic: WithCellId<MotionGroupKinematicApi>;
    readonly motion: WithCellId<MotionApi>;
    readonly coordinateSystems: WithCellId<CoordinateSystemsApi>;
    readonly motionGroupJogging: WithCellId<MotionGroupJoggingApi>;
    readonly virtualRobot: WithCellId<VirtualRobotApi>;
    readonly virtualRobotSetup: WithCellId<VirtualRobotSetupApi>;
    readonly virtualRobotMode: WithCellId<VirtualRobotModeApi>;
    readonly virtualRobotBehavior: WithCellId<VirtualRobotBehaviorApi>;
    readonly libraryProgramMetadata: WithCellId<LibraryProgramMetadataApi>;
    readonly libraryProgram: WithCellId<LibraryProgramApi>;
    readonly libraryRecipeMetadata: WithCellId<LibraryRecipeMetadataApi>;
    readonly libraryRecipe: WithCellId<LibraryRecipeApi>;
}

type NovaClientConfig = {
    /**
     * Url of the deployed Nova instance to connect to
     * e.g. https://saeattii.instance.wandelbots.io
     */
    instanceUrl: string;
    /**
     * Identifier of the cell on the Nova instance to connect this client to.
     * If omitted, the default identifier "cell" is used.
     **/
    cellId?: string;
} & Omit<Configuration, "isJsonMime" | "basePath">;
/**
 * Client for connecting to a Nova instance and controlling robots.
 */
declare class NovaClient {
    readonly config: NovaClientConfig;
    readonly api: NovaCellAPIClient;
    constructor(config: NovaClientConfig);
    connectMotionGroups(motionGroupIds: string[]): Promise<ConnectedMotionGroup[]>;
    connectMotionGroup(motionGroupId: string): Promise<ConnectedMotionGroup>;
}

export { NovaClient };
