import fs, { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { watch } from 'chokidar';
import { Test, TestingModule } from '@nestjs/testing';
import { ImageIndexingService } from '../image_indexing.service';
import { Image } from '../image.entity';
import { ImageModule } from '../image.module';
import { DataSource, Repository } from 'typeorm';
import { PathLike } from 'node:fs';
import { TypeOrmModule } from '@nestjs/typeorm';

const HASH_FILE_NAME = '.dirhash';
const ROOT_IMAGES_DIRECTORY = ''; // as defined in service

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

  let readFileMock: jest.SpyInstance;
  let writeFileMock: jest.SpyInstance;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
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

  describe('onModuleInit', () => {
    it('should sync month directories when fingerprints differ', async () => {
      // Arrange: In our mocks, for every month directory, the stored hash is "oldhash"
      // and the computed fingerprint (hash of empty directory) will be different.
      const imagesSaveSpy = jest
        .spyOn(imagesRepository, 'save')
        .mockResolvedValue(null as any);

      // Mock the readFile to return a different hash than the computed one.
      readFileMock = jest
        .spyOn(fs, 'readFile')
        .mockImplementation(
          (filePath: PathLike | FileHandle, encoding: any) => {
            if (
              typeof filePath === 'string' &&
              filePath.endsWith(HASH_FILE_NAME)
            ) {
              return Promise.resolve(
                'oldhash' // Simulate an old hash
              );
            }
            return Promise.resolve(''); // Simulate an empty directory
          }
        );
      // Mock the writeFile to simulate writing the new hash.
      writeFileMock = jest
        .spyOn(fs, 'writeFile')
        .mockImplementation((filePath: PathLike | FileHandle, data: any) => {
          if (typeof filePath === 'string' && data) {
            // Simulate writing the new hash
            return Promise.resolve();
          }
          return Promise.reject(new Error('Failed to write file'));
        });
      // Mock the readdir to simulate the directories.
      jest
        .spyOn(fs, 'readdir')
        .mockImplementation((dir: string, options: any) => {
          if (dir === path.join(ROOT_IMAGES_DIRECTORY, 'Year 2023')) {
            // Return one month directory for 2023
            return Promise.resolve([
              {
                name: '2023 (01) Test',
                isDirectory: () => true,
                parentPath: path.join(ROOT_IMAGES_DIRECTORY, 'Year 2023'),
              },
            ] as any);
          }
          if (dir === path.join(ROOT_IMAGES_DIRECTORY, 'Year 2022')) {
            // Return two month directories for 2022
            return Promise.resolve([
              {
                name: '2022 (12) Test',
                isDirectory: () => true,
                parentPath: path.join(ROOT_IMAGES_DIRECTORY, 'Year 2022'),
              },
              {
                name: '2022 (11) Test',
                isDirectory: () => true,
                parentPath: path.join(ROOT_IMAGES_DIRECTORY, 'Year 2022'),
              },
            ] as any);
          }
          // For syncing a month directory, assume there are no files
          return Promise.resolve([]);
        });

      // Act: Call onModuleInit to trigger syncLastMonthsDirs and initFileWatcher.
      await service.onModuleInit();

      // Assert: getLestMonthsDirectories returns 3 month directories so syncMonthDir should run for each.
      expect(readFileMock).toHaveBeenCalledTimes(3);
      // Each syncMonthDir calls imagesRepository.save even if with empty entries.
      expect(imagesSaveSpy).toHaveBeenCalledTimes(3);
      // Additionally, writeFile should be called to update the hash file for each month dir.
      expect(writeFileMock).toHaveBeenCalledTimes(3);
    });

    it('should not sync month directories when fingerprints are the same', async () => {
      // Arrange: In our mocks, for every month directory, the stored hash is "oldhash"
      // and the computed fingerprint (hash of empty directory) will be the same.
      // Mock the readFile to return the same hash as the computed one.
      readFileMock.mockImplementation(
        (filePath: PathLike | FileHandle, encoding: any) => {
          if (
            typeof filePath === 'string' &&
            filePath.endsWith(HASH_FILE_NAME)
          ) {
            return Promise.resolve(
              'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
            );
          }
          return Promise.resolve('');
        }
      );
      const imagesSaveSpy = jest
        .spyOn(imagesRepository, 'save')
        .mockResolvedValue(null as any);
      // Act: Call onModuleInit to trigger syncLastMonthsDirs and initFileWatcher.
      await service.onModuleInit();
      // Assert: getLestMonthsDirectories returns 3 month directories so syncMonthDir should run for each.
      expect(readFileMock).toHaveBeenCalledTimes(3);
      // Each syncMonthDir calls imagesRepository.save even if with empty entries.
      expect(imagesSaveSpy).toHaveBeenCalledTimes(0);
      // Additionally, writeFile should be called to update the hash file for each month dir.
      expect(writeFileMock).toHaveBeenCalledTimes(0);
    });

    it('should only sync month directories only for months that have changed', async () => {
      // Arrange: In our mocks, some month directories have changed and some have not.
      // Mock the readFile to return a different hash for some directories.
      readFileMock.mockImplementation(
        (filePath: PathLike | FileHandle, encoding: any) => {
          if (
            typeof filePath === 'string' &&
            filePath.endsWith(HASH_FILE_NAME)
          ) {
            if (filePath.includes('2023')) {
              return Promise.resolve(
                'oldhash' // Simulate an old hash for 2023
              );
            }
            if (filePath.includes('2022')) {
              return Promise.resolve(
                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
              ); // Simulate a new hash for 2022
            }
          }
          return Promise.resolve('');
        }
      );
      const imagesSaveSpy = jest
        .spyOn(imagesRepository, 'save')
        .mockResolvedValue(null as any);
      // Act: Call onModuleInit to trigger syncLastMonthsDirs and initFileWatcher.
      await service.onModuleInit();
      // Assert: getLestMonthsDirectories returns 3 month directories so syncMonthDir should run for each.
      expect(readFileMock).toHaveBeenCalledTimes(3);
      // Each syncMonthDir calls imagesRepository.save even if with empty entries.
      expect(imagesSaveSpy).toHaveBeenCalledTimes(1); // Only for 2023
      // Additionally, writeFile should be called to update the hash file for each month dir.
      expect(writeFileMock).toHaveBeenCalledTimes(1); // Only for 2023
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
