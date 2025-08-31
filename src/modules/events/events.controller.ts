import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFiltersDto } from './dto/event-filters.dto';
import { CreateRSVPDto } from './dto/rsvp.dto';
import { MarkAttendanceDto, MarkMultipleAttendanceDto } from './dto/attendance.dto';
import { CreateRecurringEventDto, UpdateRecurringEventDto } from './dto/recurring-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RecurringEventsService } from './recurring-events.service';
import { EventTypesService } from './event-types.service';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly recurringEventsService: RecurringEventsService,
    private readonly eventTypesService: EventTypesService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async createEvent(@Body() createEventDto: CreateEventDto, @Req() req: any) {
    return this.eventsService.createEvent(createEventDto, req.user.userId);
  }

  @Get()
  async findAll(@Query() filters: EventFiltersDto, @Req() req: any) {
    return this.eventsService.findAll(filters, req.user.userId);
  }

  @Get('team/:teamId')
  async findEventsByTeam(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query() filters: EventFiltersDto,
    @Req() req: any,
  ) {
    return this.eventsService.findEventsByTeam(teamId, req.user.userId, filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Req() req: any,
  ) {
    return this.eventsService.updateEvent(id, updateEventDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async removeEvent(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.removeEvent(id, req.user.userId);
  }

  @Post(':id/rsvp')
  async createRSVP(
    @Param('id') eventId: string,
    @Body() createRSVPDto: CreateRSVPDto,
    @Req() req: any,
  ) {
    return this.eventsService.createRSVP(eventId, createRSVPDto, req.user.userId);
  }

  @Post(':id/attendance')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async markAttendance(
    @Param('id') eventId: string,
    @Body() markAttendanceDto: MarkAttendanceDto,
    @Req() req: any,
  ) {
    return this.eventsService.markAttendance(eventId, markAttendanceDto, req.user.userId);
  }

  @Post(':id/attendance/multiple')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async markMultipleAttendance(
    @Param('id') eventId: string,
    @Body() markMultipleAttendanceDto: MarkMultipleAttendanceDto,
    @Req() req: any,
  ) {
    return this.eventsService.markMultipleAttendance(eventId, markMultipleAttendanceDto, req.user.userId);
  }

  @Get(':id/attendance')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async getAttendance(@Param('id') eventId: string, @Req() req: any) {
    return this.eventsService.getAttendance(eventId, req.user.userId);
  }

  @Delete(':id/attendance/:userId')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async removeAttendance(
    @Param('id') eventId: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
  ) {
    return this.eventsService.removeAttendance(eventId, userId, req.user.userId);
  }

  // Recurring Events Endpoints
  @Post('recurring')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async createRecurringEvent(
    @Body() createRecurringEventDto: CreateRecurringEventDto,
    @Req() req: any,
  ) {
    return this.recurringEventsService.createRecurringEvent(createRecurringEventDto, req.user.userId);
  }

  @Patch('recurring/:id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async updateRecurringEvent(
    @Param('id') parentEventId: string,
    @Body() updateRecurringEventDto: UpdateRecurringEventDto,
    @Req() req: any,
  ) {
    return this.recurringEventsService.updateRecurringEvent(parentEventId, updateRecurringEventDto, req.user.userId);
  }

  @Patch('recurring/instance/:id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async updateSingleInstance(
    @Param('id') instanceId: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    return this.recurringEventsService.updateSingleInstance(instanceId, updateData, req.user.userId);
  }

  @Delete('recurring/instance/:id')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async cancelSingleInstance(
    @Param('id') instanceId: string,
    @Req() req: any,
  ) {
    return this.recurringEventsService.cancelSingleInstance(instanceId, req.user.userId);
  }

  @Delete('recurring/:id/series')
  @UseGuards(RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  async cancelEntireSeries(
    @Param('id') parentEventId: string,
    @Req() req: any,
  ) {
    return this.recurringEventsService.cancelEntireSeries(parentEventId, req.user.userId);
  }

  @Get('recurring/:id/instances')
  async getRecurringEventInstances(
    @Param('id') parentEventId: string,
    @Req() req: any,
  ) {
    return this.recurringEventsService.getRecurringEventInstances(parentEventId, req.user.userId);
  }

  // Event Types Endpoints
  @Get('types')
  async getEventTypes() {
    return this.eventTypesService.getAllEventTypesInfo();
  }

  @Get('types/:type')
  async getEventTypeInfo(@Param('type') eventType: string) {
    return this.eventTypesService.getEventTypeDisplayInfo(eventType as any);
  }

  @Get('types/:type/subtypes')
  async getEventTypeSubtypes(@Param('type') eventType: string) {
    return this.eventTypesService.getEventTypeSubtypes(eventType as any);
  }
}
