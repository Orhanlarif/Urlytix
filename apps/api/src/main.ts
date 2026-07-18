import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JsonLogger } from './common/logging/json-logger';
import { shortLinkRewriteMiddleware } from './common/middleware/short-link-rewrite.middleware';
import { initSentryIfConfigured } from './common/observability/sentry';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  await initSentryIfConfigured();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new JsonLogger(),
  });

  const appConfig = app.get(AppConfigService);

  app.set('trust proxy', 1);

  // Pretty short URLs: /{code} → /api/r/{code} (must run before Nest routing)
  app.use(shortLinkRewriteMiddleware);

  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: appConfig.isProduction
            ? ["'none'"]
            : ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
        },
      },
      // API is called cross-origin from the web app; same-origin CORP blocks fetch.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!appConfig.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Urlytix API')
      .setDescription('Link management, analytics and workspace API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('urlytix_access')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
  }

  await app.listen(appConfig.port);
}

void bootstrap();
