import { Test, TestingModule } from '@nestjs/testing';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';

describe('InterestsController', () => {
  let controller: InterestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterestsController],
      providers: [
        {
          provide: InterestsService,
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

    controller = module.get<InterestsController>(InterestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
