import { Test, TestingModule } from '@nestjs/testing';
import { ZoneAreaController } from './zone-area.controller';

describe('ZoneAreaController', () => {
  let controller: ZoneAreaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZoneAreaController],
    }).compile();

    controller = module.get<ZoneAreaController>(ZoneAreaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
