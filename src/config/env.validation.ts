import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  validate as validateClass,
  ValidateIf,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  DIRECT_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '7d';

  @IsNumber()
  @ValidateIf((obj) => obj.PORT !== undefined)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';
}

export async function validate(config: Record<string, any>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = await validateClass(validatedConfig);

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Config validation failed: ${errorMessages}`);
  }

  return validatedConfig;
}
