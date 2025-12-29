import { Test, TestingModule } from '@nestjs/testing';
import { TechStackController } from './tech-stack.controller';

describe('TechStackController', () => {
  let controller: TechStackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechStackController],
    }).compile();

    controller = module.get<TechStackController>(TechStackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
