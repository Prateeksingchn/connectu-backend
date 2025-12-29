import { Module } from '@nestjs/common';
import { GendersModule } from './genders/genders.module';
import { InterestsModule } from './interests/interests.module';
import { HobbiesModule } from './hobbies/hobbies.module';
import { TechStackModule } from './tech-stack/tech-stack.module';
import { RolesModule } from './roles/roles.module';
import { ProfileConfigController } from './profile-config.controller';

@Module({
  imports: [
    GendersModule,
    InterestsModule,
    HobbiesModule,
    TechStackModule,
    RolesModule,
  ],
  controllers: [ProfileConfigController],
})
export class ProfileConfigModule {}
