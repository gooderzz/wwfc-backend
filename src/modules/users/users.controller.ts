import { Controller, Get, Patch, Post, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Get()
  async getUsers(@Req() req: any) {
    // Admins can get all users, managers can get all users for club-wide events
    if (req.user.role === 'ADMIN') {
      return this.usersService.getAllUsers();
    } else if (req.user.role === 'MANAGER') {
      return this.usersService.getAllUsers();
    }
    throw new Error('Unauthorized');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Patch(':id')
  async updateUserProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name?: string;
      email?: string;
      role?: string;
      status?: string;
      teamId?: number;
      primaryPositionId?: number;
      secondaryPositionId?: number;
    },
    @Req() req: any
  ) {
    console.log('Update user request:', { id, body, user: req.user });
    
    // Check if user is trying to edit their own profile or if they're admin
    if (req.user.role !== 'ADMIN' && req.user.userId !== id) {
      // Managers can only edit players in their team
      if (req.user.role === 'MANAGER') {
        const user = await this.usersService.getUserById(id);
        console.log('Manager check:', { userTeamId: (user as any).team?.id, reqUserTeamId: req.user.teamId });
        if ((user as any).team?.id !== req.user.teamId) {
          throw new Error('Managers can only edit players in their own team');
        }
      }
    }

    return this.usersService.updateUser(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/password')
  async changeUserPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newPassword: string },
    @Req() req: any
  ) {
    return this.usersService.changeUserPassword(id, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/profile')
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      bio?: string;
      height?: number;
      weight?: number;
      preferredFoot?: string;
      jerseyNumber?: number;
      dateOfBirth?: string;
      hasCar?: boolean;
      location?: string;
    },
    @Req() req: any
  ) {
    // Users can only edit their own profile, or admins/managers can edit others
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER' && req.user.userId !== id) {
      throw new Error('You can only edit your own profile');
    }

    // Managers can only edit players in their team
    if (req.user.role === 'MANAGER' && req.user.userId !== id) {
      const user = await this.usersService.getUserById(id);
      if ((user as any).team?.id !== req.user.teamId) {
        throw new Error('Managers can only edit players in their own team');
      }
    }

    return this.usersService.updateProfile(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/photo')
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { photo: string }, // Base64 encoded photo
    @Req() req: any
  ) {
    // Users can only upload their own photo, or admins/managers can upload others
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER' && req.user.userId !== id) {
      throw new Error('You can only upload your own photo');
    }

    // Managers can only upload photos for players in their team
    if (req.user.role === 'MANAGER' && req.user.userId !== id) {
      const user = await this.usersService.getUserById(id);
      if ((user as any).team?.id !== req.user.teamId) {
        throw new Error('Managers can only upload photos for players in their own team');
      }
    }

    return this.usersService.updateProfilePhoto(id, body.photo);
  }
}
