import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/user.entity';
import { RolesModule } from '../profile-config/roles/roles.module';
import { GendersModule } from '../profile-config/genders/genders.module';
import { InterestsModule } from '../profile-config/interests/interests.module';
import { HobbiesModule } from '../profile-config/hobbies/hobbies.module';
import { TechStackModule } from '../profile-config/tech-stack/tech-stack.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([User]),
    RolesModule,
    UsersModule,
    GendersModule,
    InterestsModule,
    HobbiesModule,
    TechStackModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const signOptions: JwtSignOptions = {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ||
            '1h') as JwtSignOptions['expiresIn'],
        };
        return {
          secret: config.get<string>('JWT_SECRET') || '12345',
          signOptions,
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}