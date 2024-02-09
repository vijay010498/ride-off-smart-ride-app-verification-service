import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { ApiProperty } from '@nestjs/swagger';
export class VerifyUserResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  status: VerificationStatus;

  constructor(response: VerifyUserResponseDto) {
    Object.assign(this, response);
  }
}
