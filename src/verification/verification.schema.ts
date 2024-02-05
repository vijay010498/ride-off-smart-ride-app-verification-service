import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VerificationStatus } from '../common/enums/verification-status.enum';

@Schema({ timestamps: true, id: true })
export class Verification {
  @Prop({
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
  })
  selfieS3URI: string;

  @Prop({
    required: true,
  })
  selfieObjectURL: string;

  @Prop({
    required: true,
  })
  photoIdS3URI: string;

  @Prop({
    required: true,
  })
  photoIdObjectURL: string;

  @Prop({
    required: true,
    enum: VerificationStatus,
    default: VerificationStatus.Started,
  })
  status: string;

  @Prop()
  verificationResponseFromAws: string;

  @Prop()
  verificationFailedReason: string;
}

export type VerificationDocument = Verification & Document;
export const VerificationSchema = SchemaFactory.createForClass(Verification);
