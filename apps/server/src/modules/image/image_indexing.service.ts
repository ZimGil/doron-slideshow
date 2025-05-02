import fs from 'node:fs/promises';
import path from 'node:path';
import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FSWatcher, watch } from 'chokidar';
import { Repository } from 'typeorm';
import { chain } from 'lodash';
import { Image } from './image.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';

const ROOT_IMAGES_DIRECTORY = ''; // TODO
const YEAR_DIRECTORY_NAME_REGEX = /Year (?<year>\d{4})/;
const MONTH_DIRECTORY_NAME_REGEX =
  /(?<year>\d{4})\s\((?<month>\d{2})\)(?:[[:blank:]](?<dirName>[\w[:blank:]]+))?/;
const HASH_FILE_NAME = '.dirhash';

@Module({})
export class ImageIndexingService implements OnModuleInit, OnModuleDestroy {
  private fileWatcher!: FSWatcher;

  constructor(
    @InjectRepository(Image)
    private readonly imagesRepository: Repository<Image>
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncLastMonthsDirs();
    await this.initFileWatcher();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopFileWatcher();
  }

  async provision(): Promise<void> {
    await this.stopFileWatcher();
    const yearDirs = await fs.readdir(ROOT_IMAGES_DIRECTORY, {
      withFileTypes: true,
    });

    for (const yearDir of yearDirs) {
      const isYearDir =
        yearDir.isDirectory() && YEAR_DIRECTORY_NAME_REGEX.test(yearDir.name);
      if (!isYearDir) {
        continue;
      }

      const monthDirs = await fs.readdir(
        path.join(yearDir.parentPath, yearDir.name)
      );
      for (const monthDir of monthDirs) {
        await this.syncMonthDir(monthDir);
      }
    }

    await this.initFileWatcher();
  }

  private async initFileWatcher(): Promise<void> {
    this.fileWatcher = watch(ROOT_IMAGES_DIRECTORY, {
      awaitWriteFinish: true,
      ignoreInitial: true,
    });

    this.fileWatcher.on('add', (file) => this.handleFileAdded(file));
    this.fileWatcher.on('unlink', (file) => this.handleFileRemoved(file));
    this.fileWatcher.on('error', console.error); // @TODO - logger
  }

  private async stopFileWatcher(): Promise<void> {
    if (this.fileWatcher != null) {
      this.fileWatcher.close();
    }
  }

  private async handleFileAdded(filePath: string): Promise<void> {
    const parsedImage = this.parseFilePathToImage(filePath);

    if (parsedImage == null) {
      return;
    }

    await this.imagesRepository.save(this.imagesRepository.create(parsedImage));
    await this.hashDir(filePath);
  }

  private async handleFileRemoved(filePath: string): Promise<void> {
    const parsedImage = this.parseFilePathToImage(filePath);

    if (parsedImage == null) {
      return;
    }

    const imageToDelete = await this.imagesRepository.findOneByOrFail(
      parsedImage
    );
    await this.imagesRepository.softRemove(imageToDelete);
    await this.hashDir(filePath);
  }

  private async hashDir(filePath: string): Promise<void> {
    const monthDirPath = filePath.split(path.sep).slice(0, -1).join(path.sep);
    const figerpring = await this.getMonthDirFingerprint(filePath);
    const hashFilePath = path.join(monthDirPath, HASH_FILE_NAME);

    await fs.writeFile(hashFilePath, figerpring, 'utf-8');
  }

  private async getMonthDirFingerprint(monthDirPath: string): Promise<string> {
    const hash = createHash('sha256');

    const files = await fs.readdir(monthDirPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(monthDirPath, file.name);
      const stat = await fs.stat(filePath);
      hash.update(filePath);
      hash.update(stat.size.toString());
      hash.update(stat.mtimeMs.toString());
    }

    return hash.digest('hex');
  }

  private parseFilePathToImage(filePath: string): {
    year: number;
    month: number;
    extension: string;
    filename: string;
    dirName: string;
  } | null {
    const foo = MONTH_DIRECTORY_NAME_REGEX.exec(filePath);
    if (foo?.groups == null) return null;
    const extension = path.extname(filePath);
    const filename = path.basename(filePath, extension);
    const dirName = path.dirname(filePath);

    const { year, month } = foo.groups;

    return {
      year: Number(year),
      month: Number(month),
      filename,
      extension,
      dirName,
    };
  }

  private async syncLastMonthsDirs(): Promise<void> {
    const lastMonthsDirs = await this.getLestMonthsDirectories();

    for (const monthDir of lastMonthsDirs) {
      const storedFingerPrint = await fs.readFile(
        path.join(monthDir, HASH_FILE_NAME),
        'utf-8'
      );
      const currentFingerPrint = await this.getMonthDirFingerprint(monthDir);

      if (storedFingerPrint != currentFingerPrint) {
        await this.syncMonthDir(monthDir);
      }
    }
  }

  private async syncMonthDir(monthDirPath: string): Promise<void> {
    const files = await fs.readdir(monthDirPath);

    const imageEntries = chain(files)
      .map((file) => this.parseFilePathToImage(file))
      .compact()
      .value();
    await this.imagesRepository.save(
      this.imagesRepository.create(imageEntries)
    );
    await this.hashDir(monthDirPath);
  }

  private async getLestMonthsDirectories(
    numberOfMonths = 3
  ): Promise<string[]> {
    const entries = await fs.readdir(ROOT_IMAGES_DIRECTORY, {
      withFileTypes: true,
    });
    const latestTwoYears = chain(entries)
      .filter((entry) => entry.isDirectory())
      .orderBy('name', 'desc')
      .take(2)
      .value();
    const latestYear = latestTwoYears[0];
    const latestYearMonthsDirs = await fs.readdir(
      path.join(latestYear.parentPath, latestYear.name),
      { withFileTypes: true }
    );
    const lastMonthsDirs = chain(latestYearMonthsDirs)
      .filter((monthDir) => monthDir.isDirectory())
      .orderBy('name', 'desc')
      .take(numberOfMonths)
      .map((monthDir) => path.join(monthDir.parentPath, monthDir.name))
      .value();

    if (lastMonthsDirs.length < 3) {
      const lastYear = latestTwoYears[1];
      const lastYearMonthsDirs = await fs.readdir(
        path.join(lastYear.parentPath, lastYear.name),
        { withFileTypes: true }
      );
      lastMonthsDirs.push(
        ...chain(lastYearMonthsDirs)
          .filter((monthDir) => monthDir.isDirectory())
          .orderBy('name', 'desc')
          .take(numberOfMonths - lastMonthsDirs.length)
          .map((monthDir) => path.join(monthDir.parentPath, monthDir.name))
          .value()
      );
    }

    return lastMonthsDirs;
  }
}
