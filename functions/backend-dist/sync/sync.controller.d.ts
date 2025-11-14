import { SyncService } from './sync.service';
import { PushChangesDto } from './dto/push-changes.dto';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    pushChanges(dto: PushChangesDto): Promise<{
        processed: number;
        failed: number;
    }>;
    pullChanges(deviceId: string, since?: string): Promise<any[]>;
}
