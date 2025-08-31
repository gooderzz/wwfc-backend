import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AdjustBalanceDto } from './dto/user-balance.dto';

@Injectable()
export class UserBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserBalance(userId: number) {
    let userBalance = await this.prisma.userBalance.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create balance record if it doesn't exist
    if (!userBalance) {
      userBalance = await this.prisma.userBalance.create({
        data: {
          userId,
          currentBalance: 0,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    }

    return userBalance;
  }

  async adjustBalance(userId: number, adjustBalanceDto: AdjustBalanceDto) {
    const { amount, reason } = adjustBalanceDto;
    const adjustmentAmount = parseFloat(amount);

    // Get or create user balance
    let userBalance = await this.prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!userBalance) {
      userBalance = await this.prisma.userBalance.create({
        data: {
          userId,
          currentBalance: 0,
        },
      });
    }

    // Calculate new balance
    const newBalance = parseFloat(userBalance.currentBalance.toString()) + adjustmentAmount;

    // Update balance
    const updatedBalance = await this.prisma.userBalance.update({
      where: { userId },
      data: {
        currentBalance: newBalance,
        lastUpdated: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Only create adjustment records for manual balance adjustments, not for payments
    // Payments already create their own records, so we don't need duplicate adjustment records
    if (reason && !reason.includes('Square payment') && !reason.includes('payment')) {
      await this.prisma.paymentRecord.create({
        data: {
          userId,
          paymentType: 'SOCIAL_EVENT', // Using this as a catch-all for adjustments
          amount: Math.abs(adjustmentAmount).toString(),
          discountAmount: '0',
          finalAmount: Math.abs(adjustmentAmount).toString(),
          status: adjustmentAmount >= 0 ? 'PAID' : 'DUE',
          dueDate: new Date(),
          paidDate: adjustmentAmount >= 0 ? new Date() : null,
          paymentMethod: 'MANUAL',
          notes: reason || `Balance adjustment: ${adjustmentAmount >= 0 ? '+' : ''}${adjustmentAmount}`,
        },
      });
    }

    return updatedBalance;
  }

  async getPaymentHistory(userId: number, limit?: number) {
    const userBalance = await this.getUserBalance(userId);

    if (!userBalance) {
      throw new NotFoundException(`User balance for user ${userId} not found`);
    }

    const paymentRecords = await this.prisma.paymentRecord.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            eventType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit || 50,
    });

    return {
      currentBalance: userBalance.currentBalance,
      lastUpdated: userBalance.lastUpdated,
      paymentHistory: paymentRecords,
    };
  }

  async calculateBalance(userId: number) {
    // Calculate balance from payment records
    const paymentRecords = await this.prisma.paymentRecord.findMany({
      where: { userId },
      select: {
        finalAmount: true,
        status: true,
      },
    });

    let calculatedBalance = 0;

    for (const record of paymentRecords) {
      const amount = parseFloat(record.finalAmount.toString());
      
      if (record.status === 'PAID') {
        calculatedBalance -= amount; // Money paid reduces balance
      } else {
        calculatedBalance += amount; // Money owed increases balance
      }
    }

    // Update the user balance record
    await this.prisma.userBalance.upsert({
      where: { userId },
      update: {
        currentBalance: calculatedBalance,
        lastUpdated: new Date(),
      },
      create: {
        userId,
        currentBalance: calculatedBalance,
      },
    });

    return calculatedBalance;
  }

  async getTeamBalances(teamId: number) {
    const users = await this.prisma.user.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userBalance: {
          select: {
            currentBalance: true,
            lastUpdated: true,
          },
        },
      },
    });

    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      currentBalance: user.userBalance?.currentBalance || 0,
      lastUpdated: user.userBalance?.lastUpdated || null,
    }));
  }

  async getOverdueBalances(teamId?: number) {
    const where: any = {
      status: 'OVERDUE',
    };

    if (teamId) {
      where.user = {
        teamId,
      };
    }

    const overduePayments = await this.prisma.paymentRecord.findMany({
      where,
      include: {
        user: {
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
        },
        event: {
          select: {
            id: true,
            title: true,
            eventType: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return overduePayments;
  }
}
