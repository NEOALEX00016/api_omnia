import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CategoriesModule } from './categories/categories.module';
import { FinanceModule } from './finance/finance.module';
import { AccountsModule } from './accounts/accounts.module';
import { CountriesModule } from './countries/countries.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { getEnvNumber, getRequiredEnv } from './common/env';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: getEnvNumber('DB_PORT', 5432),
      username: process.env.DB_USER || 'postgres',
      password: getRequiredEnv(['DB_PASSWORD', 'DB_PASS']),
      database: process.env.DB_NAME || 'omnia',
      autoLoadEntities: true,
      synchronize: false,
      schema: 'omnia',
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    CategoriesModule,
    FinanceModule,
    AccountsModule,
    CountriesModule,
    CurrenciesModule,
    MailModule,
  ],
})
export class AppModule {}
