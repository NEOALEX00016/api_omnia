# Omnia Backend

Backend API de Omnia construido con NestJS, TypeORM y PostgreSQL.

## Stack

- NestJS
- TypeORM
- PostgreSQL
- JWT
- Nodemailer

## Requisitos

- Node.js 18+
- PostgreSQL 15+

## Instalacion

```bash
npm install
```

## Variables de entorno

Usa `.env.example` como base para desarrollo.

Para produccion puedes partir de `.env.production.example`.

Variables principales:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD` o `DB_PASS`
- `DB_NAME`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SSL_CERT_PATH`
- `SSL_KEY_PATH`
- `API_PORT_PRODUCCION`
- `API_PORT_DESARROLLO`
- `CORS_ORIGIN`

## Desarrollo

```bash
npm run start:dev
```

Sin SSL, el backend levanta por defecto en:

- `http://localhost:5001/des/v1`

Swagger en desarrollo:

- `http://localhost:5001/des`

## Produccion

```bash
npm run build
npm run start:prod
```

Con SSL configurado, el backend levanta por defecto en:

- `https://tu-dominio:4001/api/v1`

Si `SSL_CERT_PATH` y `SSL_KEY_PATH` no existen o no estan disponibles, el backend arranca sin HTTPS.

## Versionado y prefijos

La API usa versionado URI con version por defecto `v1`.

Rutas esperadas:

- Desarrollo: `/des/v1/...`
- Produccion: `/api/v1/...`

Ejemplos:

- `POST /api/v1/auth/login`
- `GET /api/v1/finance/summary`
- `POST /api/v1/auth/register`

## Auth y correo

Incluye:

- registro con OTP por correo
- verificacion de email
- reenvio de OTP
- recuperacion de contrasena con OTP
- login con Google
- login con Apple

Notas:

- usuarios Google y Apple quedan verificados automaticamente
- usuarios email/password deben verificar correo
- el OTP vence a los 15 minutos

## Base de datos

El backend crea algunas columnas faltantes con `ALTER TABLE IF NOT EXISTS` al iniciar ciertos servicios.

Para produccion se recomienda aplicar previamente los cambios de esquema necesarios desde SQL administrado.

## Docker

Build:

```bash
docker build -t omnia-backend .
```

Run:

```bash
docker run --env-file .env.production.example -p 4001:4001 omnia-backend
```

## GitHub

Repositorio remoto actual:

- `https://github.com/NEOALEX00016/api_omnia.git`
