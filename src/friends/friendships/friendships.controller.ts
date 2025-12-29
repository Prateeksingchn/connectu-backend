import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FriendshipsService } from './friendships.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';

@Controller('friends')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Post('request')
  async sendFriendRequest(
    @CurrentUser() user: any,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendshipsService.sendFriendRequest(user.id, dto);
  }

  @Patch('respond')
  async respondToFriendRequest(
    @CurrentUser() user: any,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendshipsService.respondToFriendRequest(user.id, dto);
  }

  @Get()
  async getFriends(@CurrentUser() user: any) {
    return this.friendshipsService.getFriends(user.id);
  }

  @Get('requests')
  async getPendingRequests(@CurrentUser() user: any) {
    return this.friendshipsService.getPendingRequests(user.id);
  }
}

