import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsModule } from './catalogs/catalogs.module';
import { validateEnvironment } from './config/environment';
import { createTypeOrmOptions } from './database/typeorm-options';
import { HealthModule } from './health/health.module';

const environment = process.env.NODE_ENV ?? 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${environment}`,
      ignoreEnvFile: environment === 'production',
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),
    HealthModule,
    CatalogsModule,
  ],
})
export class AppModule {}
