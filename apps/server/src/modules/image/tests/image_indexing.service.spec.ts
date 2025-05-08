import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ImageIndexingService } from '../image_indexing.service';
import { Image } from '../image.entity';
import { ImageModule } from '../image.module';
import { DataSource, Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

const DORON_IMAGES_LIBRARY_PATH = 'DORON_IMAGES_LIBRARY_PATH';
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

  describe('ImageIndexingService onModuleInit syncing logic', () => {
    let tempLibraryPath: string;
    let dirUpToDate: string;
    let dirOutdated: string;
    let dirWrongHash: string;

    // Helper function to compute the directory fingerprint like service.getMonthDirFingerprint
    async function computeDirHash(dir: string): Promise<string> {
      const hash = createHash('sha256');
      const files = await fs.readdir(dir);
      files.forEach((file) => {
        hash.update(file);
      });
      return hash.digest('hex');
    }

    beforeAll(async () => {
      // Create a temporary directory to act as the images library
      tempLibraryPath = await fs.mkdtemp(
        path.join(os.tmpdir(), 'test-library-')
      );
      // Create three month directories:
      //   • dirUpToDate: contains a file and a correct .dirhash
      //   • dirOutdated: contains a file and an outdated .dirhash
      //   • dirWrongHash: contains a file and an incorrect .dirhash
      dirUpToDate = path.join(tempLibraryPath, 'upToDate');
      dirOutdated = path.join(tempLibraryPath, 'outdated');
      dirWrongHash = path.join(tempLibraryPath, 'wrongHash');

      await fs.mkdir(dirUpToDate, { recursive: true });
      await fs.mkdir(dirOutdated, { recursive: true });
      await fs.mkdir(dirWrongHash, { recursive: true });

      // Create a dummy image file in each directory
      await fs.writeFile(
        path.join(dirUpToDate, 'testA.png'),
        'dummy content A'
      );
      await fs.writeFile(
        path.join(dirOutdated, 'testB.png'),
        'dummy content B'
      );
      await fs.writeFile(
        path.join(dirWrongHash, 'testC.png'),
        'dummy content C'
      );

      // For the up-to-date directory, compute and write the correct hash
      const correctHash = await computeDirHash(dirUpToDate);
      await fs.writeFile(
        path.join(dirUpToDate, '.dirhash'),
        correctHash,
        'utf-8'
      );

      // For the other two directories, write an incorrect hash value
      await fs.writeFile(
        path.join(dirOutdated, '.dirhash'),
        'outdated',
        'utf-8'
      );
      await fs.writeFile(
        path.join(dirWrongHash, '.dirhash'),
        'wronghash',
        'utf-8'
      );
    });

    afterAll(async () => {
      // Clean up our temporary library folder after tests
      await fs.rm(tempLibraryPath, { recursive: true, force: true });
    });

    it('should sync only directories with missing or outdated hash on module init', async () => {
      // Use the test_images directory for testing
      const testImagesPath = path.join(__dirname, 'test_images');
      const dirUpToDate = path.join(testImagesPath, '2024', '2024 (03) hash up to dash');
      const dirOutdated = path.join(testImagesPath, '2024', '2024 (04) hash missing a file');
      const dirNoHash = path.join(testImagesPath, '2025', '2025 (02) no hash');

      // Ensure the initial state of the directories
      const outdatedHashPath = path.join(dirOutdated, '.dirhash');
      const noHashPath = path.join(dirNoHash, '.dirhash');

      // Remove .dirhash from the no-hash directory if it exists
      await fs.rm(noHashPath, { force: true });

      // Write an outdated hash to the outdated directory
      await fs.writeFile(outdatedHashPath, 'outdated', 'utf-8');

      // Helper function to calculate the fingerprint directly
      const calculateFingerprint = async (dirPath: string): Promise<string> => {
        const hash = createHash('sha256');
        const files = await fs.readdir(dirPath);
        files.forEach((file) => {
          hash.update(file);
        });
        return hash.digest('hex');
      };

      // Trigger onModuleInit (which calls syncLastMonthsDirs)
      await service.onModuleInit();

      // Verify that the .dirhash file is updated for the outdated and no-hash directories
      const updatedOutdatedHash = await fs.readFile(outdatedHashPath, 'utf-8');
      const updatedNoHash = await fs.readFile(noHashPath, 'utf-8');

      const currentOutdatedHash = await calculateFingerprint(dirOutdated);
      const currentNoHash = await calculateFingerprint(dirNoHash);

      expect(updatedOutdatedHash).toBe(currentOutdatedHash);
      expect(updatedNoHash).toBe(currentNoHash);

      // Verify that the up-to-date directory's hash remains unchanged
      const upToDateHashPath = path.join(dirUpToDate, '.dirhash');
      const upToDateHash = await fs.readFile(upToDateHashPath, 'utf-8');
      const currentUpToDateHash = await calculateFingerprint(dirUpToDate);

      expect(upToDateHash).toBe(currentUpToDateHash);
    });
  });
});
