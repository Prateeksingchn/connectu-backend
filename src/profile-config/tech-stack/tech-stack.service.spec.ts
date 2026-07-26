import { Test, TestingModule } from '@nestjs/testing';
import { TechStackService } from './tech-stack.service';
import { TechStackRepository } from './tech-stack.repository';

describe('TechStackService', () => {
  let service: TechStackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechStackService,
        {
          provide: TechStackRepository,
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

    service = module.get<TechStackService>(TechStackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
