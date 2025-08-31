import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReactionType } from '@prisma/client';

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(
    authorId: number,
    title: string,
    content: string,
    teamId?: number,
    isPublic: boolean = true,
  ) {
    return this.prisma.post.create({
      data: {
        title,
        content,
        authorId,
        teamId,
        isPublic,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            _count: {
              select: {
                reactions: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });
  }

  async getPosts(userId: number, userRole: string, userTeamId?: number) {
    const where: any = {};

    // If user is not admin, filter posts based on their team and public posts
    if (userRole !== 'ADMIN') {
      where.OR = [
        { isPublic: true },
        { teamId: userTeamId },
      ];
    }

    return this.prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            _count: {
              select: {
                reactions: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPostById(postId: string, userId: number, userRole: string, userTeamId?: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                reactions: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check access permissions
    if (userRole !== 'ADMIN' && !post.isPublic && post.teamId !== userTeamId) {
      throw new ForbiddenException('Access denied');
    }

    return post;
  }

  async updatePost(
    postId: string,
    title: string,
    content: string,
    authorId: number,
    userRole: string,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Only author can edit (admins can only delete, not edit others' posts)
    if (post.authorId !== authorId) {
      throw new ForbiddenException('Only the author can edit this post');
    }

    // Determine which fields were edited
    const titleEdited = post.title !== title;
    const contentEdited = post.content !== content;

    return this.prisma.post.update({
      where: { id: postId },
      data: { 
        title,
        content,
        isEdited: true, // Mark as edited
        titleEdited: titleEdited || post.titleEdited, // Keep true if previously edited
        contentEdited: contentEdited || post.contentEdited, // Keep true if previously edited
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            _count: {
              select: {
                reactions: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });
  }

  async deletePost(postId: string, authorId: number, userRole: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Only author or admin can delete
    if (post.authorId !== authorId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the author or admin can delete this post');
    }

    return this.prisma.post.delete({
      where: { id: postId },
    });
  }

  async createComment(postId: string, authorId: number, content: string) {
    // Verify post exists and user has access
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.comment.create({
      data: {
        content,
        authorId,
        postId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });
  }

  async updateComment(
    commentId: string,
    authorId: number,
    userRole: string,
    content: string,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author can edit (admins can only delete, not edit others' comments)
    if (comment.authorId !== authorId) {
      throw new ForbiddenException('Only the author can edit this comment');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { 
        content,
        isEdited: true, // Mark as edited
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });
  }

  async deleteComment(commentId: string, authorId: number, userRole: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author or admin can delete
    if (comment.authorId !== authorId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only the author or admin can delete this comment');
    }

    return this.prisma.comment.delete({
      where: { id: commentId },
    });
  }

  async addReaction(
    userId: number,
    type: ReactionType,
    postId?: string,
    commentId?: string,
  ) {
    if (!postId && !commentId) {
      throw new Error('Either postId or commentId must be provided');
    }

    if (postId && commentId) {
      throw new Error('Cannot react to both post and comment simultaneously');
    }

    // Remove existing reaction if any
    await this.prisma.reaction.deleteMany({
      where: {
        userId,
        postId: postId || null,
        commentId: commentId || null,
      },
    });

    // Add new reaction
    return this.prisma.reaction.create({
      data: {
        type,
        userId,
        postId,
        commentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async removeReaction(userId: number, postId?: string, commentId?: string) {
    if (!postId && !commentId) {
      throw new Error('Either postId or commentId must be provided');
    }

    return this.prisma.reaction.deleteMany({
      where: {
        userId,
        postId: postId || null,
        commentId: commentId || null,
      },
    });
  }
}
