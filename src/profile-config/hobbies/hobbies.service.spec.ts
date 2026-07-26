import { Test, TestingModule } from '@nestjs/testing';
import { HobbiesService } from './hobbies.service';
import { HobbiesRepository } from './hobbies.repository';

describe('HobbiesService', () => {
  let service: HobbiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HobbiesService,
        {
          provide: HobbiesRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HobbiesService>(HobbiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
