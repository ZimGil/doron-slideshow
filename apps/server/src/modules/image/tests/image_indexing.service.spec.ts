import path from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { ImageIndexingService } from '../image_indexing.service';
import { Image } from '../image.entity';
import { ImageModule } from '../image.module';
import { DataSource, Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

const DORON_IMAGES_LIBRARY_PATH = 'DORON_IMAGES_LIBRARY_PATH'
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('ImageIndexingService', () => {
  let app: TestingModule;
  let service: ImageIndexingService;
  let imagesRepository: Repository<Image>;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              [DORON_IMAGES_LIBRARY_PATH]: path.join(
                __dirname,
                'test_images'
              ),
            }),
          ],
        }),
        ImageModule,
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [Image],
          synchronize: true,
        }),
      ],
    }).compile();

    await app.init();

    service = app.get<ImageIndexingService>(ImageIndexingService);
    const dataSource = app.get<DataSource>(DataSource);
    imagesRepository = dataSource.getRepository(Image);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  


});
