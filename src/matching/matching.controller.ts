import { Controller, Post, Delete, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MatchingService } from './matching.service';

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}
  
  @Post('join-queue')
  async joinQueue(@CurrentUser() user: any) {
    return this.matchingService.joinQueue(user.id);
  }

  @Delete('leave-queue')
  async leaveQueue(@CurrentUser() user: any) {
    return this.matchingService.leaveQueue(user.id);
  }

  @Delete('clear-queue')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async clearQueue() {
    return this.matchingService.clearAllUsersFromQueue();
  }

  @Delete('end-chat-room/:id')
  async endChatRoom(@Param('id') id: string, @CurrentUser() user: any) {
    return this.matchingService.endActiveChatRoom(id, user.id);
  }
}

