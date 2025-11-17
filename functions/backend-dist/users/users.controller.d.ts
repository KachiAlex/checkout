import { UsersService } from './users.service';
import { ChangePinDto } from './dto/change-pin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    list(req: any): Promise<import("./users.service").SafeUser[]>;
    create(req: any, dto: CreateUserDto): Promise<{
        user: import("./users.service").SafeUser;
        temporaryPin?: string;
    }>;
    update(id: string, req: any, dto: UpdateUserDto): Promise<import("./users.service").SafeUser>;
    resetPin(id: string, req: any, body: {
        pin: string;
    }): Promise<{
        success: boolean;
    }>;
    changePin(req: any, dto: ChangePinDto): Promise<{
        success: boolean;
    }>;
    delete(id: string, req: any): Promise<void>;
}
