import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderRequestsService } from './order-requests.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { CreateReturnRequestDto } from './dto/return-request.dto';
import { CreateCancellationRequestDto } from './dto/cancellation-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER ORDERS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly requestsService: OrderRequestsService,
  ) {}

  /**
   * POST /api/v1/orders — Place an order
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place an order from cart or buy-now' })
  @ApiResponse({ status: 201, description: 'Order placed successfully' })
  @ApiResponse({ status: 400, description: 'Cart empty or insufficient stock' })
  async createOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, dto);
  }

  /**
   * GET /api/v1/orders — Order history
   */
  @Get()
  @ApiOperation({ summary: 'Get my order history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @Query() filter: OrderFilterDto,
  ) {
    return this.ordersService.findMyOrders(userId, filter);
  }

  /**
   * GET /api/v1/orders/:id — Order detail
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async getOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.findMyOrder(userId, orderId);
  }

  /**
   * GET /api/v1/orders/:id/tracking — Live tracking timeline
   */
  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get order tracking timeline' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async getTracking(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.getTracking(userId, orderId);
  }

  /**
   * POST /api/v1/orders/:id/cancel — Customer self-cancellation
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order (only allowed before shipping)' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() body: { reason: string },
  ) {
    return this.ordersService.requestCancellation(userId, orderId, body.reason);
  }

  /**
   * POST /api/v1/orders/:id/return — Request a return
   */
  @Post(':id/return')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a return for a delivered order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async requestReturn(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.requestsService.createReturnRequest(userId, orderId, dto);
  }

  /**
   * GET /api/v1/orders/:id/return — Get return requests for an order
   */
  @Get(':id/return')
  @ApiOperation({ summary: 'Get return requests for an order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async getReturnRequests(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.requestsService.getReturnRequests(userId, orderId);
  }

  /**
   * POST /api/v1/orders/:id/cancellation-request — Request cancellation (post-processing)
   */
  @Post(':id/cancellation-request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request cancellation after order has been packed/shipped' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async requestCancellationReview(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateCancellationRequestDto,
  ) {
    return this.requestsService.createCancellationRequest(userId, orderId, dto);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ORDERS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ResolveReturnRequestDto } from './dto/return-request.dto';
import { ResolveCancellationRequestDto } from './dto/cancellation-request.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, RequestStatus } from '../../common/enums';

@ApiTags('Admin — Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'admin/orders', version: '1' })
export class AdminOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly requestsService: OrderRequestsService,
  ) {}

  /**
   * GET /api/v1/admin/orders
   */
  @Get()
  @ApiOperation({ summary: 'Admin: List all orders' })
  async findAll(@Query() filter: OrderFilterDto) {
    return this.ordersService.findAllOrders(filter);
  }

  /**
   * GET /api/v1/admin/orders/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async findOne(@Param('id', ParseUUIDPipe) orderId: string) {
    return this.ordersService.findOrderById(orderId);
  }

  /**
   * PATCH /api/v1/admin/orders/:id/status
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin: Update order status' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.ordersService.updateOrderStatus(orderId, dto, adminId);
  }

  /**
   * GET /api/v1/admin/orders/return-requests
   */
  @Get('return-requests')
  @ApiOperation({ summary: 'Admin: List all return requests' })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  async getReturnRequests(@Query('status') status?: RequestStatus) {
    return this.requestsService.getAllReturnRequests(status);
  }

  /**
   * PATCH /api/v1/admin/orders/return-requests/:id
   */
  @Patch('return-requests/:id')
  @ApiOperation({ summary: 'Admin: Approve or reject a return request' })
  @ApiParam({ name: 'id', description: 'ReturnRequest UUID' })
  async resolveReturn(
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() dto: ResolveReturnRequestDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.requestsService.resolveReturnRequest(requestId, dto, adminId);
  }

  /**
   * GET /api/v1/admin/orders/cancellation-requests
   */
  @Get('cancellation-requests')
  @ApiOperation({ summary: 'Admin: List all cancellation requests' })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  async getCancellationRequests(@Query('status') status?: RequestStatus) {
    return this.requestsService.getAllCancellationRequests(status);
  }

  /**
   * PATCH /api/v1/admin/orders/cancellation-requests/:id
   */
  @Patch('cancellation-requests/:id')
  @ApiOperation({ summary: 'Admin: Approve or reject a cancellation request' })
  @ApiParam({ name: 'id', description: 'CancellationRequest UUID' })
  async resolveCancellation(
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() dto: ResolveCancellationRequestDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.requestsService.resolveCancellationRequest(requestId, dto, adminId);
  }

  /**
   * GET /api/v1/admin/orders/analytics/revenue
   */
  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Admin: Get revenue summary for date range' })
  @ApiQuery({ name: 'from', description: 'ISO date', example: '2024-06-01' })
  @ApiQuery({ name: 'to', description: 'ISO date', example: '2024-06-30' })
  async getRevenue(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.ordersService.getRevenueSummary(new Date(from), new Date(to));
  }
}
