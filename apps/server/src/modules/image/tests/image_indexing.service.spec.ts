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

const DORON_IMAGES_LIBRARY_PATH = 'DORON_IMAGES_LIBRARY_PATH';
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('ImageIndexingService', () => {
  let app: TestingModule;

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

    await app.init();
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
      files.forEach((file) => {
        hash.update(file);
      });
      return hash.digest('hex');
    }

    beforeAll(async () => {
      jest.spyOn(ConfigService.prototype, 'getOrThrow').mockImplementation((key: string) => {
        if (key === DORON_IMAGES_LIBRARY_PATH) {
          return tempLibraryPath;
        }
        throw new Error(`Unexpected config key: ${key}`);
      });

      tempLibraryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'test-library-'));
      
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
  });
});
