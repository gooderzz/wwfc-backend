import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReactionType } from '@prisma/client';

@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Post('posts')
  async createPost(
    @Body() body: {
      title: string;
      content: string;
      teamId?: number;
      isPublic?: boolean;
    },
    @Req() req: any,
  ) {
    const { title, content, teamId, isPublic = true } = body;
    
    // Managers can only post to their own team
    if (req.user.role === 'MANAGER' && teamId !== req.user.teamId) {
      throw new Error('Managers can only post to their own team');
    }

    return this.communicationService.createPost(
      req.user.userId,
      title,
      content,
      teamId,
      isPublic,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('posts')
  async getPosts(@Req() req: any) {
    return this.communicationService.getPosts(
      req.user.userId,
      req.user.role,
      req.user.teamId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('posts/:id')
  async getPostById(@Param('id') postId: string, @Req() req: any) {
    return this.communicationService.getPostById(
      postId,
      req.user.userId,
      req.user.role,
      req.user.teamId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('posts/:id')
  async updatePost(
    @Param('id') postId: string,
    @Body() body: {
      title: string;
      content: string;
    },
    @Req() req: any,
  ) {
    return this.communicationService.updatePost(
      postId,
      body.title,
      body.content,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id')
  async deletePost(@Param('id') postId: string, @Req() req: any) {
    return this.communicationService.deletePost(
      postId,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/comments')
  async createComment(
    @Param('postId') postId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    return this.communicationService.createComment(
      postId,
      req.user.userId,
      body.content,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('comments/:id')
  async updateComment(
    @Param('id') commentId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    return this.communicationService.updateComment(
      commentId,
      req.user.userId,
      req.user.role,
      body.content,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  async deleteComment(@Param('id') commentId: string, @Req() req: any) {
    return this.communicationService.deleteComment(
      commentId,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/reactions')
  async addPostReaction(
    @Param('postId') postId: string,
    @Body() body: { type: ReactionType },
    @Req() req: any,
  ) {
    return this.communicationService.addReaction(
      req.user.userId,
      body.type,
      postId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:postId/reactions')
  async removePostReaction(@Param('postId') postId: string, @Req() req: any) {
    return this.communicationService.removeReaction(req.user.userId, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:commentId/reactions')
  async addCommentReaction(
    @Param('commentId') commentId: string,
    @Body() body: { type: ReactionType },
    @Req() req: any,
  ) {
    return this.communicationService.addReaction(
      req.user.userId,
      body.type,
      undefined,
      commentId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId/reactions')
  async removeCommentReaction(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    return this.communicationService.removeReaction(
      req.user.userId,
      undefined,
      commentId,
    );
  }
}
