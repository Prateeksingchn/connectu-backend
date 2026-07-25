import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  LoginResponseDto,
  MeResponseDto,
  RegisterResponseDto,
} from './dto/auth-response.dto';
import { ApiErrorResponse, ApiWrappedResponse } from '../common/decorators/api-response.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Register a new account',
    description:
      'Creates a user with the given profile attributes (gender, interests, hobbies, tech stack). ' +
      'The password is bcrypt-hashed before storage. Does not log the user in — call /auth/login afterwards.',
  })
  @ApiWrappedResponse(RegisterResponseDto, {
    status: 201,
    description: 'Account created',
  })
  @ApiErrorResponse(400, 'Invalid genderId, interest/hobby/tech-stack id, or DTO validation failure', [
    'Invalid gender ID',
  ])
  @ApiErrorResponse(409, 'Email already registered', 'Email already registered')
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Log in with email and password',
    description: 'Verifies credentials with bcrypt and returns a signed JWT access token.',
  })
  @ApiWrappedResponse(LoginResponseDto, { description: 'Authenticated successfully' })
  @ApiErrorResponse(401, 'Email not found or password does not match', 'Invalid credentials')
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({
    summary: 'Get the current authenticated user',
    description: 'Returns the identity encoded in the JWT (id, email, role) after JwtAuthGuard validates the token.',
  })
  @ApiBearerAuth('access-token')
  @ApiWrappedResponse(MeResponseDto, { description: 'Current user identity' })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
