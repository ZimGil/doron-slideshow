import fs, { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { watch } from 'chokidar';
import { Test, TestingModule } from '@nestjs/testing';
import { ImageIndexingService } from './image_indexing.service';
import { Image } from './image.entity';
import { ImageModule } from './image.module';
import { DataSource, Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PathLike } from 'node:fs';
import { ConfigModule } from '@nestjs/config';

const HASH_FILE_NAME = '.dirhash';

jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('ImageIndexingService', () => {
  let service: ImageIndexingService;
  let imagesRepository: Repository<Image>;

  let readFileMock: jest.SpyInstance;
  let writeFileMock: jest.SpyInstance;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ImageModule,
        ConfigModule.forRoot({
          load: [() => ({ DORON_IMAGES_LIBRARY_PATH: 'foo' })],
        }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          dropSchema: true,
          entities: [Image],
          synchronize: true,
        }),
      ],
    }).compile();

    service = module.get<ImageIndexingService>(ImageIndexingService);
    const dataSource = module.get<DataSource>(DataSource);
    imagesRepository = dataSource.getRepository(Image);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    beforeEach(async () => {
      // Setup fs mocks to simulate a controlled directory structure

      // When getLestMonthsDirectories is called:
      // First call: list year directories from ROOT_IMAGES_DIRECTORY
      jest
        .spyOn(fs, 'readdir')
        .mockImplementation((dir: PathLike, options?: any) => {
          if (dir === ROOT_IMAGES_DIRECTORY) {
            // Return two fake year directories
            return Promise.resolve([
              {
                name: 'Year 2023',
                isDirectory: () => true,
                parentPath: '/fake',
              },
              {
                name: 'Year 2022',
                isDirectory: () => true,
                parentPath: '/fake',
              },
            ] as any);
          }
          if (dir === path.join('/fake', 'Year 2023')) {
            // Return one month directory for 2023
            return Promise.resolve([
              {
                name: '2023 (01) Test',
                isDirectory: () => true,
                parentPath: '/fake/Year 2023',
              },
            ] as any);
          }
          if (dir === path.join('/fake', 'Year 2022')) {
            // Return two month directories for 2022
            return Promise.resolve([
              {
                name: '2022 (12) Test',
                isDirectory: () => true,
                parentPath: '/fake/Year 2022',
              },
              {
                name: '2022 (11) Test',
                isDirectory: () => true,
                parentPath: '/fake/Year 2022',
              },
            ] as any);
          }
          // For syncing a month directory, assume there are no files
          return Promise.resolve([]);
        });

      // When reading a hash file in syncLastMonthsDirs, always return an "oldhash"
      readFileMock = jest
        .spyOn(fs, 'readFile')
        .mockImplementation(
          (filePath: PathLike | FileHandle, encoding: any) => {
            if (
              typeof filePath === 'string' &&
              filePath.endsWith(HASH_FILE_NAME)
            ) {
              return Promise.resolve('oldhash');
            }
            return Promise.resolve('');
          }
        );

      // When syncing a month directory, hashDir will call writeFile; just resolve.
      writeFileMock = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      // When calculating a month directory fingerprint, getMonthDirFingerprint will call fs.readdir.
      // Here, simulate an empty directory so that the computed hash is always the hash of an empty string.
      // This digest (sha256 of empty string) is:
      // e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      jest.spyOn(fs, 'stat').mockResolvedValue({ size: 0, mtimeMs: 0 } as any);
    });
    it('should sync month directories when fingerprints differ', async () => {
      // Arrange: In our mocks, for every month directory, the stored hash is "oldhash"
      // and the computed fingerprint (hash of empty directory) will be different.
      const imagesSaveSpy = jest
        .spyOn(imagesRepository, 'save')
        .mockResolvedValue(null as any);

      // Act: Call onModuleInit to trigger syncLastMonthsDirs and initFileWatcher.
      await service.onModuleInit();

      // Assert: getLestMonthsDirectories returns 3 month directories so syncMonthDir should run for each.
      expect(readFileMock).toHaveBeenCalledTimes(3);
      // Each syncMonthDir calls imagesRepository.save even if with empty entries.
      expect(imagesSaveSpy).toHaveBeenCalledTimes(3);
      // Additionally, writeFile should be called to update the hash file for each month dir.
      expect(writeFileMock).toHaveBeenCalledTimes(3);
    });

    it('should initialize file watcher and register listeners', async () => {
      // Arrange: Reset fs mocks for readdir so they don't interfere.
      // Using the same mocks, after onModuleInit, initFileWatcher is called.
      await service.onModuleInit();

      // Assert: verify that chokidar.watch was called with the correct directory and options.
      expect(watch).toHaveBeenCalledWith(ROOT_IMAGES_DIRECTORY, {
        awaitWriteFinish: true,
        ignoreInitial: true,
      });
      // Retrieve the watcher instance returned from chokidar.watch.
      const watcher = (watch as jest.Mock).mock.results[0].value;
      // Verify that event listeners were registered.
      expect(watcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(watcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
      expect(watcher.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});

// We recommend installing an extension to run jest tests.
