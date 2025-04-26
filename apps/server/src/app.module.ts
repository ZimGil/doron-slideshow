import { Module } from '@nestjs/common'
import { ImageModule } from './modules/images/images.module';

@Module({
  imports: [ImageModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
