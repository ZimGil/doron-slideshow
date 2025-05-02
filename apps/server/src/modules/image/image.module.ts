import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Image } from "./image.entity";
import { ImageIndexingService } from "./image_indexing.service";

@Module({
  imports: [TypeOrmModule.forFeature([Image])],
  providers: [ImageIndexingService],
})
export class ImageModule {}
