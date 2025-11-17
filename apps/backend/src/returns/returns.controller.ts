import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReturnStatus } from './returns.repository';

@ApiTags('returns')
@Controller('returns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a return/refund request' })
  @ApiResponse({ status: 201, description: 'Return created' })
  async create(@Body() createReturnDto: CreateReturnDto, @Request() req: any) {
    return this.returnsService.create(
      createReturnDto,
      req.user.sub,
      req.user.locationId || req.user.tenantId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all returns' })
  @ApiResponse({ status: 200, description: 'List of returns' })
  async findAll(
    @Query('location_id') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: ReturnStatus,
  ) {
    return this.returnsService.findAll(locationId, from, to, status);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search returns by return number' })
  @ApiResponse({ status: 200, description: 'Return found' })
  async searchByReturnNumber(@Query('returnNumber') returnNumber: string) {
    return this.returnsService.findByReturnNumber(returnNumber);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get returns for an order' })
  @ApiResponse({ status: 200, description: 'List of returns for order' })
  async findByOrderId(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.returnsService.findByOrderId(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return by ID' })
  @ApiResponse({ status: 200, description: 'Return found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.returnsService.findOne(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a return (restores inventory and processes refund)' })
  @ApiResponse({ status: 200, description: 'Return approved' })
  async approve(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.returnsService.approve(id, req.user.sub);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a return' })
  @ApiResponse({ status: 200, description: 'Return rejected' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    return this.returnsService.reject(id, req.user.sub, body.reason);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark return as completed' })
  @ApiResponse({ status: 200, description: 'Return completed' })
  async complete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.returnsService.complete(id, req.user.sub);
  }
}

