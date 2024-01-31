import { IsNotEmpty } from 'class-validator';

export class VerifyUserDto {
  @IsNotEmpty()
  selfie: any; // This will hold the uploaded selfie image

  @IsNotEmpty()
  photoId: any; // This will hold the uploaded photoId image
}
