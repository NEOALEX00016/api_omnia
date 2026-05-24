import 'dotenv/config';
import { existsSync, readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

function getHttpsOptions() {
  const certPath = process.env.SSL_CERT_PATH?.trim();
  const keyPath = process.env.SSL_KEY_PATH?.trim();

  if (!certPath && !keyPath) {
    return undefined;
  }

  if (!certPath || !keyPath) {
    return undefined;
  }

  if (!existsSync(certPath)) {
    return undefined;
  }

  if (!existsSync(keyPath)) {
    return undefined;
  }

  return {
    cert: readFileSync(certPath),
    key: readFileSync(keyPath),
  };
}

async function bootstrap() {
  const httpsOptions = getHttpsOptions();
  const sslAvailable = Boolean(httpsOptions);
  const app = await NestFactory.create(AppModule, {
    cors: true,
    httpsOptions,
  });
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : true;
  const prefix = sslAvailable ? 'api' : 'des';
  const port = sslAvailable
    ? Number(process.env.API_PORT_PRODUCCION || process.env.PORT || 4001)
    : Number(process.env.API_PORT_DESARROLLO || process.env.PORT || 5001);

  if (sslAvailable) {
    console.log('Iniciando con SSL');
  } else {
    console.warn('SSL no disponible. Iniciando sin HTTPS');
  }

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.setGlobalPrefix(prefix);
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(`Omnia API${sslAvailable ? '' : ' Desarrollo'}`)
      .setDescription(`API for Omnia Productivity App${sslAvailable ? '' : ' Desarrollo'}`)
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(prefix, app, document);
    console.log(`Swagger habilitado en /${prefix}`);
  } else {
    console.log('Swagger deshabilitado en produccion');
  }

  await app.listen(port);
  console.log(`Aplicacion iniciada en puerto ${port} con prefijo /${prefix}`);
}
bootstrap();
