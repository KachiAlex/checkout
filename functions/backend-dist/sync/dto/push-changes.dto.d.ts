declare class SyncEventDto {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    client_ts: number;
}
export declare class PushChangesDto {
    deviceId: string;
    events: SyncEventDto[];
}
export {};
