import { Test, TestingModule } from '@nestjs/testing';
import { ZoneAreaService } from './zone-area.service';

describe('ZoneAreaService', () => {
  let service: ZoneAreaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZoneAreaService],
    }).compile();

    service = module.get<ZoneAreaService>(ZoneAreaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
