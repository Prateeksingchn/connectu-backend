import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { RolesService } from '../profile-config/roles/roles.service';
import { GendersService } from '../profile-config/genders/genders.service';
import { InterestsService } from '../profile-config/interests/interests.service';
import { HobbiesService } from '../profile-config/hobbies/hobbies.service';
import { TechStackService } from '../profile-config/tech-stack/tech-stack.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RoleName } from '../profile-config/roles/role.enum';
import { User } from '../users/user.entity';
import { Hobby } from '../profile-config/hobbies/hobbies.entity';
import { TechStack } from '../profile-config/tech-stack/tech-stack.entity';
import { Interest } from 'src/profile-config/interests/interest.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
    private readonly gendersService: GendersService,
    private readonly interestsService: InterestsService,
    private readonly hobbiesService: HobbiesService,
    private readonly techStackService: TechStackService,
    private readonly jwtService: JwtService,
  ) { }
  
  async register(        dto: RegisterDto) {
    const exists = await this.usersRepository.findByEmail(dto.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const [gender, interests, hobbies, techStacks] = await Promise.all([
      this.validateGender(dto.genderId),
      this.validateEntities<Interest>(dto.interests, this.interestsService, 'interest'),
      this.validateEntities<Hobby>(dto.hobbies, this.hobbiesService, 'hobby'),
      this.validateEntities<TechStack>(dto.techStack, this.techStackService, 'tech stack'),
    ]);

    const role = dto.role || RoleName.USER;
    await this.rolesService.findByName(role);

    const user = new User();
    user.email = dto.email;
    user.name = dto.name;
    user.password = dto.password; 
    user.role = role;
    user.gender = gender;
    user.interests = interests;
    user.hobbies = hobbies;
    user.techStack = techStacks;

    const saved = await this.usersRepository.create(user);

    return {
      message: 'Registration successful. Please login to continue.',
      user: {
        id: saved.id,
        email: saved.email,
        name: saved.name,
        role: saved.role,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordOk = await bcrypt.compare(dto.password, user.password);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.signToken(user.id, user.email, user.role);
    return {
      access_token: token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  // this is to just find user by id.
  validateUser(id: string) {
    return this.usersRepository.findById(id);
  }

  private signToken(sub: string, email: string, role: RoleName) {
    return this.jwtService.signAsync({ sub, email, role });
  }

  private async validateGender(genderId: number) {
    const gender = await this.gendersService.findOne(genderId);
    if (!gender) {
      throw new BadRequestException('Invalid gender ID');
    }
    return gender;
  }

  private async validateEntities<T>(
    ids: number[],
    service: any,
    entityName: string,
  ): Promise<T[]> {
    const promises = ids.map((id) => service.findOne(id));
    const entities = await Promise.all(promises);

    const invalidIndex = entities.findIndex((entity) => !entity);
    if (invalidIndex !== -1) {
      throw new BadRequestException(
        `Invalid ${entityName} ID: ${ids[invalidIndex]}`,
      );
    }
    return entities as T[];
  }
}