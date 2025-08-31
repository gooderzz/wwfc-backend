import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ access_token: string }> {
    const { name, email, password } = registerDto;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'PLAYER',
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            division: true,
            slug: true,
          }
        }
      }
    });
    
    const payload = { 
      sub: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role,
      status: user.status,
      teamId: user.teamId,
      team: user.team ? {
        id: user.team.id,
        name: user.team.name,
        division: user.team.division,
        slug: user.team.slug,
      } : null
    };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token };
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    const { email, password } = loginDto;
    const user = await this.prisma.user.findUnique({ 
      where: { email },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            division: true,
            slug: true,
          }
        }
      }
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    
    const payload = { 
      sub: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role,
      status: user.status,
      teamId: user.teamId,
      team: user.team ? {
        id: user.team.id,
        name: user.team.name,
        division: user.team.division,
        slug: user.team.slug,
      } : null
    };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token };
  }

  async generateTokenForUser(userId: number): Promise<{ access_token: string }> {
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            division: true,
            slug: true,
          }
        }
      }
    });
    
    if (!user) throw new UnauthorizedException('User not found');
    
    const payload = { 
      sub: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role,
      status: user.status,
      teamId: user.teamId,
      team: user.team ? {
        id: user.team.id,
        name: user.team.name,
        division: user.team.division,
        slug: user.team.slug,
      } : null
    };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token };
  }
}
