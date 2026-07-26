import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { RolesService } from '../profile-config/roles/roles.service';
import { GendersService } from '../profile-config/genders/genders.service';
import { InterestsService } from '../profile-config/interests/interests.service';
import { HobbiesService } from '../profile-config/hobbies/hobbies.service';
import { TechStackService } from '../profile-config/tech-stack/tech-stack.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        { provide: RolesService, useValue: { findByName: jest.fn() } },
        { provide: GendersService, useValue: { findOne: jest.fn() } },
        { provide: InterestsService, useValue: { findOne: jest.fn() } },
        { provide: HobbiesService, useValue: { findOne: jest.fn() } },
        { provide: TechStackService, useValue: { findOne: jest.fn() } },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
