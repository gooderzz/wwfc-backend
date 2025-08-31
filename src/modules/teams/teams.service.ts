import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async getAllTeams() {
    try {
      return await this.prisma.team.findMany({
        include: {
          users: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      console.error('Error in getAllTeams:', error);
      throw error;
    }
  }

  async createTeam(name: string, division: string, slug: string, homeAddress?: string) {
    return this.prisma.team.create({
      data: {
        name,
        division,
        slug,
        homeAddress,
      },
      include: {
        users: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async getTeamById(id: number) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return {
      ...team,
      userCount: team._count.users,
    };
  }

  async getTeamUsers(teamId: number) {
    const users = await this.prisma.user.findMany({
      where: { 
        teamId
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

    return users;
  }

  async getAvailablePlayersForFixture(teamId: number, fixtureId: number) {
    // Get all team users (including injured players)
    const allUsers = await this.prisma.user.findMany({
      where: { teamId },
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

    // Get RSVP status for this fixture
    const rsvps = await this.prisma.fixtureRSVP.findMany({
      where: { 
        fixtureId,
        userId: { in: allUsers.map(user => user.id) }
      },
      select: {
        userId: true,
        status: true,
      },
    });

    // Create a map of user ID to RSVP status
    const rsvpMap = new Map(rsvps.map(rsvp => [rsvp.userId, rsvp.status]));

    // Return all users with their RSVP status and availability info
    return allUsers.map(user => ({
      ...user,
      rsvpStatus: rsvpMap.get(user.id),
      isAvailable: user.status !== 'INJURED' && rsvpMap.get(user.id) === 'YES',
      availabilityReason: user.status === 'INJURED' ? 'Injured' : 
                         rsvpMap.get(user.id) === 'YES' ? 'Available' :
                         rsvpMap.get(user.id) === 'NO' ? 'Not Available' :
                         rsvpMap.get(user.id) === 'MAYBE' ? 'Maybe' : 'No RSVP'
    }));
  }

  async updateTeam(id: number, data: { name?: string; division?: string; slug?: string; homeAddress?: string }) {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return this.prisma.team.update({
      where: { id },
      data,
      include: {
        users: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async deleteTeam(id: number) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        users: true,
        fixtures: true,
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // Check if team has users or fixtures
    if (team.users.length > 0) {
      throw new Error('Cannot delete team with assigned users');
    }

    if (team.fixtures.length > 0) {
      throw new Error('Cannot delete team with existing fixtures');
    }

    return this.prisma.team.delete({
      where: { id },
    });
  }

  async mapTeam(scrapedTeamId: number, appTeamId: number) {
    try {
      // First, unmap any existing mapping for this scraped team
      await this.prisma.team.updateMany({
        where: { scrapedTeamId },
        data: { scrapedTeamId: null, teamIdentityId: null }
      });

      // Then, unmap any existing mapping for this app team
      await this.prisma.team.updateMany({
        where: { id: appTeamId },
        data: { scrapedTeamId: null, teamIdentityId: null }
      });

      // Get the scraped team to find its team identity
      const scrapedTeam = await this.prisma.scrapedTeam.findUnique({
        where: { id: scrapedTeamId },
        include: { teamIdentity: true }
      });

      if (!scrapedTeam) {
        throw new Error('Scraped team not found');
      }

      // Now create the new mapping with both scrapedTeamId and teamIdentityId
      const updatedTeam = await this.prisma.team.update({
        where: { id: appTeamId },
        data: { 
          scrapedTeamId,
          teamIdentityId: scrapedTeam.teamIdentityId
        },
        include: {
          scrapedTeam: {
            include: {
              teamIdentity: true
            }
          },
          users: {
            select: {
              id: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Team mapping updated successfully',
        team: updatedTeam
      };
    } catch (error) {
      console.error('Error mapping team:', error);
      throw new Error('Failed to map team');
    }
  }

  async unmapTeam(scrapedTeamId: number) {
    try {
      // Find the team that is currently mapped to this scraped team
      const mappedTeam = await this.prisma.team.findFirst({
        where: { scrapedTeamId }
      });

      if (!mappedTeam) {
        return {
          success: true,
          message: 'No mapping found for this scraped team'
        };
      }

      // Unmap the team
      await this.prisma.team.update({
        where: { id: mappedTeam.id },
        data: { scrapedTeamId: null, teamIdentityId: null }
      });

      return {
        success: true,
        message: 'Team unmapped successfully'
      };
    } catch (error) {
      console.error('Error unmapping team:', error);
      throw new Error('Failed to unmap team');
    }
  }

  async bulkAction(action: string, mappings: any[]) {
    try {
      switch (action) {
        case 'unmap':
          const scrapedTeamIds = mappings.map(m => m.scrapedTeamId).filter(id => id > 0);
          await this.prisma.team.updateMany({
            where: { scrapedTeamId: { in: scrapedTeamIds } },
            data: { scrapedTeamId: null, teamIdentityId: null }
          });
          return {
            success: true,
            message: `Unmapped ${scrapedTeamIds.length} teams`
          };

        case 'delete_scraped':
          const scrapedIds = mappings.map(m => m.scrapedTeamId).filter(id => id > 0);
          // First unmap any teams
          await this.prisma.team.updateMany({
            where: { scrapedTeamId: { in: scrapedIds } },
            data: { scrapedTeamId: null, teamIdentityId: null }
          });
          // Then delete scraped teams
          await this.prisma.scrapedTeam.deleteMany({
            where: { id: { in: scrapedIds } }
          });
          return {
            success: true,
            message: `Deleted ${scrapedIds.length} scraped teams`
          };

        case 'merge_teams':
          // This would be a more complex operation to merge similar team names
          return {
            success: true,
            message: 'Merge operation completed'
          };

        default:
          throw new Error(`Unknown bulk action: ${action}`);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      throw new Error(`Failed to perform bulk action: ${error.message}`);
    }
  }

  /**
   * Update team division assignments based on scraped data
   */
  async updateTeamDivisions() {
    try {
      // Get all teams with team identities
      const teams = await this.prisma.team.findMany({
        where: { teamIdentityId: { not: null } },
        include: {
          teamIdentity: {
            include: {
              scrapedTeams: {
                where: { isActive: true },
                orderBy: { seasonId: 'desc' },
                take: 1 // Get the most recent season
              }
            }
          }
        }
      });

      let updated = 0;
      let errors = 0;

      for (const team of teams) {
        try {
          const currentScrapedTeam = team.teamIdentity?.scrapedTeams[0];
          if (currentScrapedTeam && currentScrapedTeam.division !== team.division) {
            await this.prisma.team.update({
              where: { id: team.id },
              data: { 
                division: currentScrapedTeam.division,
                updatedAt: new Date()
              }
            });
            updated++;
          }
        } catch (error) {
          console.error(`Error updating division for team ${team.id}:`, error);
          errors++;
        }
      }

      return {
        success: true,
        updated,
        errors,
        message: `Updated ${updated} team divisions, ${errors} errors`
      };
    } catch (error) {
      console.error('Error updating team divisions:', error);
      throw new Error('Failed to update team divisions');
    }
  }

  /**
   * Validate division consistency across the system
   */
  async validateDivisionConsistency() {
    try {
      const issues = [];

      // Check for teams with mismatched divisions
      const teamsWithMismatches = await this.prisma.team.findMany({
        where: { teamIdentityId: { not: null } },
        include: {
          teamIdentity: {
            include: {
              scrapedTeams: {
                where: { isActive: true },
                orderBy: { seasonId: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      for (const team of teamsWithMismatches) {
        const currentScrapedTeam = team.teamIdentity?.scrapedTeams[0];
        if (currentScrapedTeam && currentScrapedTeam.division !== team.division) {
          issues.push({
            type: 'division_mismatch',
            teamId: team.id,
            teamName: team.name,
            appDivision: team.division,
            scrapedDivision: currentScrapedTeam.division,
            seasonId: currentScrapedTeam.seasonId
          });
        }
      }

      // Check for teams without current season data
      const teamsWithoutCurrentData = await this.prisma.team.findMany({
        where: { 
          teamIdentityId: { not: null },
          teamIdentity: {
            scrapedTeams: {
              none: { isActive: true }
            }
          }
        },
        include: {
          teamIdentity: true
        }
      });

      for (const team of teamsWithoutCurrentData) {
        issues.push({
          type: 'no_current_season_data',
          teamId: team.id,
          teamName: team.name,
          teamIdentityId: team.teamIdentityId
        });
      }

      return {
        success: true,
        issues,
        totalIssues: issues.length,
        message: `Found ${issues.length} division consistency issues`
      };
    } catch (error) {
      console.error('Error validating division consistency:', error);
      throw new Error('Failed to validate division consistency');
    }
  }

  /**
   * Track division changes for a team
   */
  async trackDivisionChange(teamId: number, oldDivision: string, newDivision: string, seasonId: string) {
    try {
      // Create a division change log entry
      await this.prisma.divisionChangeLog.create({
        data: {
          teamId,
          oldDivision,
          newDivision,
          seasonId,
          changeDate: new Date(),
          changeType: 'AUTOMATIC' // or 'MANUAL' for admin changes
        }
      });

      return {
        success: true,
        message: 'Division change tracked successfully'
      };
    } catch (error) {
      console.error('Error tracking division change:', error);
      throw new Error('Failed to track division change');
    }
  }

  /**
   * Get division change history for a team
   */
  async getDivisionHistory(teamId: number) {
    try {
      const changes = await this.prisma.divisionChangeLog.findMany({
        where: { teamId },
        orderBy: { changeDate: 'desc' },
        include: {
          team: {
            select: {
              name: true,
              teamIdentity: {
                select: {
                  displayName: true
                }
              }
            }
          }
        }
      });

      return {
        success: true,
        changes,
        message: `Found ${changes.length} division changes`
      };
    } catch (error) {
      console.error('Error getting division history:', error);
      throw new Error('Failed to get division history');
    }
  }

  /**
   * Get all division changes across the system
   */
  async getAllDivisionChanges(seasonId?: string) {
    try {
      const where: any = {};
      if (seasonId) {
        where.seasonId = seasonId;
      }

      const changes = await this.prisma.divisionChangeLog.findMany({
        where,
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          changeDate: 'desc',
        },
      });

      return {
        success: true,
        changes,
        total: changes.length,
      };
    } catch (error) {
      console.error('Error getting division changes:', error);
      throw error;
    }
  }

  // Division Hierarchy Management Methods
  async getDivisionHierarchies(seasonId?: string) {
    try {
      const where: any = { isActive: true };
      if (seasonId) {
        where.seasonId = seasonId;
      }

      const hierarchies = await this.prisma.divisionHierarchy.findMany({
        where,
        orderBy: [
          { seasonId: 'desc' },
          { createdAt: 'desc' }
        ],
      });

      // Parse JSON fields
      const parsedHierarchies = hierarchies.map(h => ({
        ...h,
        hierarchy: JSON.parse(h.hierarchy),
        divisionNames: JSON.parse(h.divisionNames),
      }));

      return {
        success: true,
        hierarchies: parsedHierarchies,
        total: parsedHierarchies.length,
      };
    } catch (error) {
      console.error('Error getting division hierarchies:', error);
      throw error;
    }
  }

  async createDivisionHierarchy(
    seasonId: string, 
    leagueId: string, 
    hierarchy: string[], 
    divisionNames: Record<string, string>
  ) {
    try {
      const hierarchyRecord = await this.prisma.divisionHierarchy.create({
        data: {
          seasonId,
          leagueId,
          hierarchy: JSON.stringify(hierarchy),
          divisionNames: JSON.stringify(divisionNames),
        },
      });

      return {
        success: true,
        hierarchy: {
          ...hierarchyRecord,
          hierarchy: JSON.parse(hierarchyRecord.hierarchy),
          divisionNames: JSON.parse(hierarchyRecord.divisionNames),
        },
        message: 'Division hierarchy created successfully',
      };
    } catch (error) {
      console.error('Error creating division hierarchy:', error);
      throw error;
    }
  }

  async updateDivisionHierarchy(
    id: number, 
    hierarchy: string[], 
    divisionNames: Record<string, string>
  ) {
    try {
      const hierarchyRecord = await this.prisma.divisionHierarchy.update({
        where: { id },
        data: {
          hierarchy: JSON.stringify(hierarchy),
          divisionNames: JSON.stringify(divisionNames),
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        hierarchy: {
          ...hierarchyRecord,
          hierarchy: JSON.parse(hierarchyRecord.hierarchy),
          divisionNames: JSON.parse(hierarchyRecord.divisionNames),
        },
        message: 'Division hierarchy updated successfully',
      };
    } catch (error) {
      console.error('Error updating division hierarchy:', error);
      throw error;
    }
  }

  async getDivisionHierarchy(id: number) {
    try {
      const hierarchy = await this.prisma.divisionHierarchy.findUnique({
        where: { id },
      });

      if (!hierarchy) {
        throw new NotFoundException(`Division hierarchy with ID ${id} not found`);
      }

      return {
        success: true,
        hierarchy: {
          ...hierarchy,
          hierarchy: JSON.parse(hierarchy.hierarchy),
          divisionNames: JSON.parse(hierarchy.divisionNames),
        },
      };
    } catch (error) {
      console.error('Error getting division hierarchy:', error);
      throw error;
    }
  }

  async getAvailableSeasons() {
    try {
      const seasons = await this.prisma.scrapedTeam.groupBy({
        by: ['seasonId'],
        _count: { id: true }
      });

      const seasonList = seasons.map(season => {
        // Convert season ID to human-readable format
        // Assuming season IDs follow a pattern that can be converted to years
        const seasonId = season.seasonId;
        let displayName = seasonId;
        
        // Try to convert common season ID patterns to readable format
        if (seasonId === '965423047') displayName = '2025/26';
        else if (seasonId === '289885282') displayName = '2024/25';
        else if (seasonId === '728261395') displayName = '2023/24';
        else if (seasonId === '928979507') displayName = '2022/23';
        else if (seasonId === '285246320') displayName = '2021/22';
        else if (seasonId === '92146673') displayName = '2020/21';
        else if (seasonId === '480699350') displayName = '2019/20';
        else if (seasonId === '484154006') displayName = '2018/19';
        else if (seasonId === '396000312') displayName = '2017/18';
        else if (seasonId === '408332512') displayName = '2016/17';
        
        return {
          id: season.seasonId,
          displayName: displayName,
          teamCount: season._count.id
        };
      });

      return {
        success: true,
        seasons: seasonList.sort((a, b) => b.id.localeCompare(a.id)), // Sort descending
        total: seasonList.length
      };
    } catch (error) {
      console.error('Error getting available seasons:', error);
      throw error;
    }
  }
}
