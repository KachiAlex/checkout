import { UsersRepository, UserRecord } from './users.repository';
import { ChangePinDto } from './dto/change-pin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LocationsRepository } from '../locations/locations.repository';
export type SafeUser = Omit<UserRecord, 'pinHash'>;
export declare class UsersService {
    private readonly usersRepository;
    private readonly locationsRepository;
    constructor(usersRepository: UsersRepository, locationsRepository: LocationsRepository);
    private ensureTenant;
    private toSafeUser;
    changePin(userId: string, dto: ChangePinDto): Promise<void>;
    listUsers(tenantId: string): Promise<SafeUser[]>;
    createUser(tenantId: string, dto: CreateUserDto, actor: UserRecord): Promise<{
        user: SafeUser;
        temporaryPin?: string;
    }>;
    updateUser(tenantId: string, userId: string, dto: UpdateUserDto, actor: UserRecord): Promise<SafeUser>;
    private determineLocationIdForCreation;
    private validateLocationOwnership;
    deleteUser(tenantId: string, userId: string, actor: UserRecord): Promise<void>;
    resetPin(tenantId: string, userId: string, newPin: string, actor: UserRecord): Promise<void>;
}
