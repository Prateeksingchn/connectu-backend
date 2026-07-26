import { Test, TestingModule } from '@nestjs/testing';
import { TechStackController } from './tech-stack.controller';
import { TechStackService } from './tech-stack.service';

describe('TechStackController', () => {
  let controller: TechStackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechStackController],
      providers: [
        {
          provide: TechStackService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TechStackController>(TechStackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
