import fs from 'fs/promises';
import path from 'path';
import { Inject, Module } from "@nestjs/common";
import { IMAGES_DIR_PATH } from './constants';
import { chain } from 'lodash';
import { Image } from './image.entity';
import { DataSource, DeepPartial, Repository } from 'typeorm';

const YEAR_DIRECTORY_NAME_REGEX = /Year (?<year>\d{4})/;
const MONTH_DIRECTORY_NAME_REGEX = /(?<year>\d{4})\s\((?<month>\d{2})\)(?:[[:blank:]](?<dirName>[\w[:blank:]]+))?/;
const supportedImageExtensions = ['jpg', 'jpeg', 'png', 'gif'];


@Module({})
export class ImageService {

  constructor(@Inject(DataSource) private readonly datasource: DataSource) {}

  async regeneratemageEntries(): Promise<void> {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const imageTransactionalRepository = queryRunner.manager.getRepository(Image);
    try {
      await imageTransactionalRepository.clear();
      await this.generateImageEntries(imageTransactionalRepository);
      await queryRunner.commitTransaction();
    } catch (error) {
      console.error('Error generating image entries:', error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  private async generateImageEntries(imageTransactionalRepository: Repository<Image>): Promise<void> {
    const monthDirectories = await this.getMonthDirectories();

    for (const monthDir of monthDirectories) {
      const { year, month, path: dirPath, dirName } = monthDir;
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const imageEntries: DeepPartial<Image>[] = chain(files)
        .filter((file) => file.isFile())
        .map((file) => {
          const extension = path.extname(file.name);
          const fileName = path.basename(file.name, extension);
          const filePath = path.join(dirPath, file.name);
          return {
            year,
            month,
            dirName,
            filename: fileName,
            extension,
            path: filePath
          };
        })
        .filter((file) => supportedImageExtensions.includes(file.extension.toLowerCase()))
        .value()

        await imageTransactionalRepository.insert(imageEntries);
    }
  }

  private async getMonthDirectories(): Promise<{ year: number, month: number, dirName?: string; path: string }[]> {
    const rootContent = await fs.readdir(IMAGES_DIR_PATH, { withFileTypes: true });
    const yearDirectories = rootContent.filter((dir) => dir.isDirectory() && YEAR_DIRECTORY_NAME_REGEX.test(dir.name));

    const res: { year: number, month: number, dirName?: string; path: string }[] = [];
    for (const yearDir of yearDirectories) {
      const yearContent = await fs.readdir(path.join(IMAGES_DIR_PATH, yearDir.name), { withFileTypes: true });
      const monthDirectories = yearContent.filter((dir) => dir.isDirectory() && MONTH_DIRECTORY_NAME_REGEX.test(dir.name));

      for (const monthDir of monthDirectories) {
        const monthDirMatch = MONTH_DIRECTORY_NAME_REGEX.exec(monthDir.name)

        if (!(monthDirMatch?.groups?.year && monthDirMatch.groups.month)) continue;

        const year = Number(monthDirMatch.groups.year);
        const month = Number(monthDirMatch.groups.month);
        const dirName = monthDirMatch.groups.dirName;

        res.push({
          year,
          month,
          path: path.join(IMAGES_DIR_PATH, yearDir.name, monthDir.name),
          dirName
        })
      }
    }

    return res;
  }
}
