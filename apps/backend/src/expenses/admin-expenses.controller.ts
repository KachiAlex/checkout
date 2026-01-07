import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@pos-checkout/shared';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

interface AuthenticatedUser {
  tenantId: string;
  sub: string;
  role?: UserRole;
  isPlatformAdmin?: boolean;
}

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@ApiTags('admin-expenses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/expenses')
export class AdminExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  private ensureTenantAdmin(req: AuthenticatedRequest) {
    if (req.user?.isPlatformAdmin) return;
    if (req.user?.role === UserRole.ADMIN) return;
    throw new ForbiddenException('Only tenant administrators can manage expenses');
  }

  @Post()
  @ApiOperation({ summary: 'Create an expense and auto-post accounting journal' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateExpenseDto) {
    this.ensureTenantAdmin(req);
    return this.expensesService.createExpense({
      tenantId: req.user.tenantId,
      createdBy: req.user.sub,
      dto,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List expenses' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.ensureTenantAdmin(req);
    return this.expensesService.listExpenses({
      tenantId: req.user.tenantId,
      locationId,
      from,
      to,
    });
  }
}
