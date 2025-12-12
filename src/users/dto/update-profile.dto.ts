import { IsString, IsEmail, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.png', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^$|^https?:\/\/.+$/, {
    message: 'avatar must be a valid URL or empty',
  })
  avatar?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Current password must be at least 8 characters' })
  currentPassword: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'New password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}

export class UserProfileResponseDto {
  @ApiProperty({ example: 'b1809bf0-d346-48f2-838b-a609d892c460' })
  id: string;

  @ApiProperty({ example: 'admin@taskflow.dev' })
  email: string;

  @ApiProperty({ example: 'Admin' })
  firstName: string;

  @ApiProperty({ example: 'User' })
  lastName: string;

  @ApiProperty({ example: null, nullable: true })
  avatar?: string;

  @ApiProperty({ example: 'ADMIN' })
  role: string;

  @ApiProperty({ example: '2025-12-12T14:43:19.932Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-12-12T14:43:19.932Z' })
  updatedAt: Date;
}
