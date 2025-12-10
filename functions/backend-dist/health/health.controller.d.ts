export declare class HealthController {
    check(): {
        status: string;
        timestamp: string;
        service: string;
    };
    ping(): {
        pong: boolean;
        timestamp: string;
    };
}
