import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { Image } from '../image.entity';
import { ImageModule } from '../image.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { chain } from 'lodash';
import { faker } from '@faker-js/faker';
import { ImageIndexingService } from '../image_indexing.service';

const DORON_IMAGES_LIBRARY_PATH = 'DORON_IMAGES_LIBRARY_PATH';
const IMAGE_INDEXING_MONTHS = 'IMAGE_INDEXING_MONTHS';
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('ImageIndexingService', () => {
  let app: TestingModule;
  let service: ImageIndexingService;
  let configService: ConfigService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              [DORON_IMAGES_LIBRARY_PATH]: path.join(__dirname, 'test_images'),
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

    service = app.get<ImageIndexingService>(ImageIndexingService);
    configService = app.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ImageIndexingService onModuleInit syncing logic', () => {
    let tempLibraryPath: string;
    let testedDirs: string[] = [];
    const allMonthDirs: string[] = [];

    async function computeDirHash(dir: string): Promise<string> {
      const hash = createHash('sha256');
      const files = await fs.readdir(dir);
      files.filter((file) => file !== '.dirhash').forEach((file) => {
        hash.update(file);
      });
      return hash.digest('hex');
    }

    beforeAll(async () => {
      tempLibraryPath =
        await fs.mkdir(path.join(process.cwd(), 'tmp', 'test-library-'), { recursive: true })
        ?? os.tmpdir();

      const numLibraries = faker.number.int({ min: 5, max: 10 });
      for (let i = 0; i < numLibraries; i++) {
         const year = faker.number.int({ min: 2000, max: 2030 });
         
         const month = faker.number.int({ min: 1, max: 12 });
         const monthStr = month.toString().padStart(2, '0');
         
         const includeOptional = faker.datatype.boolean();
         const optionalDirName = includeOptional ? `OptionalName${faker.number.int({ min: 1, max: 100 })}` : '';
         
         const monthDirName = optionalDirName ? `${year} (${monthStr}) ${optionalDirName}` : `${year} (${monthStr})`;
         const monthDirPath = path.join(tempLibraryPath, `Year ${year}`, monthDirName);
         await fs.mkdir(monthDirPath, { recursive: true });

         const numFiles = faker.number.int({ min: 3, max: 10 });
         for (let j = 0; j < numFiles; j++) {
           const fileExtension = faker.helpers.arrayElement(['png', 'jpeg']);
           const fileName = `test_image_${j}.${fileExtension}`;
           await fs.writeFile(path.join(monthDirPath, fileName), `dummy content ${j}`);
         }
         
         allMonthDirs.push(monthDirPath);
      }

      testedDirs = chain(allMonthDirs)
        .orderBy((dir) => dir, 'desc')
        .take(faker.number.int({min: 3, max: Math.max(3, numLibraries)}))
        .value();

        jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
          if (key === DORON_IMAGES_LIBRARY_PATH) {
            return tempLibraryPath;
          } else if (key === IMAGE_INDEXING_MONTHS) {
            return testedDirs.length;
          }
          throw new Error(`Unexpected config key: ${key}`);
        });

      console.log('testedDirs', testedDirs);

      const DirectoryState = {
        UP_TO_DATE: 'upToDate',
        OUTDATED: 'outdated',
        NO_HASH: 'noHash',
      };

      const stateMapping = [
        DirectoryState.UP_TO_DATE,
        DirectoryState.OUTDATED,
        DirectoryState.NO_HASH,
      ];

      for (let idx = 0; idx < testedDirs.length; idx++) {
        const dir = testedDirs[idx];
        const state = stateMapping[idx] || faker.helpers.arrayElement([
          DirectoryState.UP_TO_DATE,
          DirectoryState.OUTDATED,
          DirectoryState.NO_HASH,
        ]);

        switch (state) {
          case DirectoryState.UP_TO_DATE: {
            const correctHash = await computeDirHash(dir);
            await fs.writeFile(path.join(dir, '.dirhash'), correctHash, 'utf-8');
            break;
          }
          case DirectoryState.OUTDATED: {
            await fs.writeFile(path.join(dir, '.dirhash'), 'outdated', 'utf-8');
            break;
          }
        }
      }
    });

    afterAll(async () => {
      await fs.rm(tempLibraryPath, { recursive: true, force: true });
    });

    describe('onModuleInit', () => {
      it('should sync the last months directories', async () => {
        await service.onModuleInit();

        for (const dir of testedDirs) {
          const expectedHash = await computeDirHash(dir);
          const actualHash = await fs.readFile(path.join(dir, '.dirhash'), 'utf-8');
          expect(actualHash).toBe(expectedHash);
        }
      });
    });
  });
});
