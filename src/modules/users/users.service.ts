import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as bcrypt from 'bcrypt';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: string;
  teamId?: number;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
  teamId?: string | number;
  status?: string;
  primaryPositionId?: string | number;
  secondaryPositionId?: string | number;
}

interface UpdateProfileData {
  bio?: string;
  height?: number;
  weight?: number;
  preferredFoot?: string;
  jerseyNumber?: number;
  dateOfBirth?: string;
  hasCar?: boolean;
  location?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        primaryPosition: {
          select: {
            id: true,
            name: true,
          },
        },
        secondaryPosition: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getUsersByRole(role: string) {
    return this.prisma.user.findMany({
      where: {
        role: role as any,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        primaryPosition: {
          select: {
            id: true,
            name: true,
          },
        },
        secondaryPosition: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createUser(data: CreateUserData) {
    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: hashedPassword,
        role: data.role as any,
        teamId: data.teamId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
    });

    return user;
  }

  async updateUser(id: number, data: UpdateUserData) {
    try {
      console.log('Updating user:', { id, data });
      
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // If email is being updated, check if it's already taken
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: data.email },
        });

        if (emailExists) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Convert string IDs to integers for Prisma
      const updateData: any = {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.role && { role: data.role as any }),
        ...(data.status && { status: data.status as any }),
      };

      // Convert teamId to integer if provided
      if (data.teamId !== undefined && data.teamId !== '') {
        updateData.teamId = typeof data.teamId === 'string' ? parseInt(data.teamId) : data.teamId;
      } else if (data.teamId === '') {
        updateData.teamId = null;
      }

      // Convert primaryPositionId to integer if provided
      if (data.primaryPositionId !== undefined && data.primaryPositionId !== '') {
        updateData.primaryPositionId = typeof data.primaryPositionId === 'string' ? parseInt(data.primaryPositionId) : data.primaryPositionId;
      } else if (data.primaryPositionId === '') {
        updateData.primaryPositionId = null;
      }

      // Convert secondaryPositionId to integer if provided
      if (data.secondaryPositionId !== undefined && data.secondaryPositionId !== '') {
        updateData.secondaryPositionId = typeof data.secondaryPositionId === 'string' ? parseInt(data.secondaryPositionId) : data.secondaryPositionId;
      } else if (data.secondaryPositionId === '') {
        updateData.secondaryPositionId = null;
      }

      // Update the user
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          primaryPosition: {
            select: {
              id: true,
              name: true,
            },
          },
          secondaryPosition: {
            select: {
              id: true,
              name: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
        },
      });

      console.log('User updated successfully:', user);
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async updateProfile(id: number, data: UpdateProfileData) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.height !== undefined && { height: data.height }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.preferredFoot !== undefined && { preferredFoot: data.preferredFoot }),
        ...(data.jerseyNumber !== undefined && { jerseyNumber: data.jerseyNumber }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
        ...(data.hasCar !== undefined && { hasCar: data.hasCar }),
        ...(data.location !== undefined && { location: data.location }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        // Enhanced Profile Fields
        profilePhoto: true,
        bio: true,
        dateOfBirth: true,
        height: true,
        weight: true,
        preferredFoot: true,
        jerseyNumber: true,
        // Career Statistics
        totalGoals: true,
        totalAssists: true,
        totalCleanSheets: true,
        totalAppearances: true,
        totalMinutes: true,
        fantasyValue: true,
        // Achievements
        achievements: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            icon: true,
            earnedAt: true,
            season: true,
          },
          orderBy: {
            earnedAt: 'desc',
          },
        },
        primaryPosition: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        secondaryPosition: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changeUserPassword(id: number, newPassword: string) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Hash the new password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashedPassword,
      },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteUser(id: number) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        // Enhanced Profile Fields
        profilePhoto: true,
        bio: true,
        dateOfBirth: true,
        height: true,
        weight: true,
        preferredFoot: true,
        jerseyNumber: true,
        hasCar: true,
        location: true,
        // Career Statistics
        totalGoals: true,
        totalAssists: true,
        totalCleanSheets: true,
        totalAppearances: true,
        totalMinutes: true,
        fantasyValue: true,
        // Achievements
        achievements: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            icon: true,
            earnedAt: true,
            season: true,
          },
          orderBy: {
            earnedAt: 'desc',
          },
        },
        primaryPosition: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        secondaryPosition: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
        playerStats: {
          include: {
            fixture: {
              select: {
                id: true,
                opponent: true,
                date: true,
                location: true,
                homeGoals: true,
                awayGoals: true,
                isPlayed: true,
                team: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        rsvps: {
          include: {
            fixture: {
              select: {
                id: true,
                opponent: true,
                date: true,
                location: true,
                isPlayed: true,
                team: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            fixture: {
              date: 'asc',
            },
          },
        },
        trialistRatings: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Calculate additional statistics
    const stats = this.calculateUserStats(user);
    const availability = this.calculateAvailability(user);

    return {
      ...user,
      stats,
      availability,
    };
  }

  private calculateUserStats(user: any) {
    const playedFixtures = user.playerStats.filter((stat: any) => stat.fixture.isPlayed);
    const upcomingFixtures = user.rsvps.filter((rsvp: any) => !rsvp.fixture.isPlayed);
    
    // Calculate fixture statistics
    const totalFixtures = playedFixtures.length;
    const wins = playedFixtures.filter((stat: any) => {
      const fixture = stat.fixture;
      const isHome = fixture.location === 'HOME';
      const ourGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
      const theirGoals = isHome ? fixture.awayGoals : fixture.homeGoals;
      return ourGoals !== null && theirGoals !== null && ourGoals > theirGoals;
    }).length;
    
    const draws = playedFixtures.filter((stat: any) => {
      const fixture = stat.fixture;
      const isHome = fixture.location === 'HOME';
      const ourGoals = isHome ? fixture.homeGoals : fixture.awayGoals;
      const theirGoals = isHome ? fixture.awayGoals : fixture.homeGoals;
      return ourGoals !== null && theirGoals !== null && ourGoals === theirGoals;
    }).length;
    
    const losses = totalFixtures - wins - draws;

    // Calculate season stats
    const totalGoals = user.playerStats.reduce((sum: number, stat: any) => sum + stat.goals, 0);
    const totalAssists = user.playerStats.reduce((sum: number, stat: any) => sum + stat.assists, 0);
    const totalBonusPoints = user.playerStats.reduce((sum: number, stat: any) => sum + stat.bonusPoints, 0);
    const averageRating = user.playerStats.length > 0 
      ? user.playerStats.reduce((sum: number, stat: any) => sum + (stat.rating || 0), 0) / user.playerStats.length 
      : 0;

    return {
      totalFixtures,
      wins,
      draws,
      losses,
      winRate: totalFixtures > 0 ? (wins / totalFixtures * 100).toFixed(1) : '0.0',
      totalGoals,
      totalAssists,
      totalBonusPoints,
      averageRating: averageRating.toFixed(1),
      upcomingFixtures: upcomingFixtures.length,
    };
  }

  private calculateAvailability(user: any) {
    const upcomingRSVPs = user.rsvps.filter((rsvp: any) => !rsvp.fixture.isPlayed);
    
    const yesCount = upcomingRSVPs.filter((rsvp: any) => rsvp.status === 'YES').length;
    const noCount = upcomingRSVPs.filter((rsvp: any) => rsvp.status === 'NO').length;
    const maybeCount = upcomingRSVPs.filter((rsvp: any) => rsvp.status === 'MAYBE').length;
    const noResponseCount = upcomingRSVPs.filter((rsvp: any) => !rsvp.status).length;

    return {
      totalUpcoming: upcomingRSVPs.length,
      confirmed: yesCount,
      declined: noCount,
      maybe: maybeCount,
      noResponse: noResponseCount,
      availabilityRate: upcomingRSVPs.length > 0 
        ? (yesCount / upcomingRSVPs.length * 100).toFixed(1) 
        : '100.0',
    };
  }

  async updateProfilePhoto(id: number, photoData: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // For now, we'll store the photo as a base64 string
    // In production, you'd want to upload to a cloud service like AWS S3
    return this.prisma.user.update({
      where: { id },
      data: {
        profilePhoto: photoData,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        profilePhoto: true,
        bio: true,
        dateOfBirth: true,
        height: true,
        weight: true,
        preferredFoot: true,
        jerseyNumber: true,
        hasCar: true,
        location: true,
        totalGoals: true,
        totalAssists: true,
        totalCleanSheets: true,
        totalAppearances: true,
        totalMinutes: true,
        totalKitWashes: true,
        hasKit: true,
        fantasyValue: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
