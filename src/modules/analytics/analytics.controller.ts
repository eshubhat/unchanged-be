import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

class DateRangeQuery {
  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2024-06-30' })
  @IsDateString()
  to: string;
}

@ApiTags('Admin — Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'admin/analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard KPIs: today, this month, user count, low-stock' })
  getDashboard() {
    return this.analyticsService.getDashboardKPIs();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue summary for date range' })
  getRevenue(@Query() query: DateRangeQuery) {
    return this.analyticsService.getRevenueSummary(
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('revenue/trend')
  @ApiOperation({ summary: 'Revenue trend (day/week/month)' })
  @ApiQuery({ name: 'granularity', enum: ['day', 'week', 'month'], required: false })
  getRevenueTrend(
    @Query() query: DateRangeQuery,
    @Query('granularity') granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getRevenueTrend(
      new Date(query.from),
      new Date(query.to),
      granularity,
    );
  }

  @Get('orders/status')
  @ApiOperation({ summary: 'Order count by status' })
  getOrderStatusBreakdown(@Query() query: DateRangeQuery) {
    return this.analyticsService.getOrderStatusBreakdown(
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('products/top')
  @ApiOperation({ summary: 'Top selling products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(
    @Query() query: DateRangeQuery,
    @Query('limit') limit = 10,
  ) {
    return this.analyticsService.getTopProducts(
      new Date(query.from),
      new Date(query.to),
      Number(limit),
    );
  }

  @Get('categories/top')
  @ApiOperation({ summary: 'Revenue by category' })
  getTopCategories(@Query() query: DateRangeQuery) {
    return this.analyticsService.getTopCategories(
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('users/summary')
  @ApiOperation({ summary: 'User counts and activity summary' })
  getUserSummary() {
    return this.analyticsService.getUserSummary();
  }

  @Get('users/growth')
  @ApiOperation({ summary: 'Daily new user registrations' })
  getUserGrowth(@Query() query: DateRangeQuery) {
    return this.analyticsService.getUserGrowth(
      new Date(query.from),
      new Date(query.to),
    );
  }

  @Get('inventory/low-stock')
  @ApiOperation({ summary: 'Variants with low available stock' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  getLowStock(@Query('threshold') threshold = 10) {
    return this.analyticsService.getLowStockAlerts(Number(threshold));
  }
}
