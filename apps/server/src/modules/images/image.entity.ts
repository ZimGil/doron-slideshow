import  { Column, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Index('image_year_month_index', ['year', 'month', 'filename'])
export class Image {
  @PrimaryGeneratedColumn()
  public readonly id!: number;

  @Column()
  public readonly year!: number;

  @Column()
  public readonly month!: number;

  @Column()
  public readonly dirName?: string;

  @Column()
  public readonly filename!: string;

  @Column()
  public readonly extension!: string;

  @Column()
  public readonly path!: string;

  @DeleteDateColumn()
  public deletedAt?: Date;
}
