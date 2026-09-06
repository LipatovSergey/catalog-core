import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Let Nest close resources gracefully when the container receives SIGTERM
  app.enableShutdownHooks();

  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
