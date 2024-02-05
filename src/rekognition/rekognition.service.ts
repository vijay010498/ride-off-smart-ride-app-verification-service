import { Injectable, Logger } from '@nestjs/common';
import {
  RekognitionClient,
  CompareFacesCommand,
  CompareFacesRequest,
  DetectLabelsCommand,
  DetectLabelsRequest,
  DetectLabelsCommandOutput,
} from '@aws-sdk/client-rekognition';
import { MyConfigService } from '../my-config/my-config.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationDocument } from '../verification/verification.schema';
import { VerificationStatus } from '../common/enums/verification-status.enum';
import { SnsService } from '../sns/sns.service';
import { S3Service } from '../s3/s3.service';
@Injectable()
export class RekognitionService {
  private readonly rekognitionDefault: RekognitionClient;
  private readonly rekognitionUsEastOne: RekognitionClient;
  private readonly logger = new Logger(RekognitionService.name);
  constructor(
    private readonly configService: MyConfigService,
    @InjectModel('Verification')
    private readonly verificationCollection: Model<VerificationDocument>,
    private readonly snsService: SnsService,
    private readonly s3Service: S3Service,
  ) {
    this.rekognitionDefault = new RekognitionClient({
      apiVersion: 'latest',
      region: this.configService.getDefaultAwsRegion(),
      credentials: {
        accessKeyId: this.configService.getAWSRekognitionAccessID(),
        secretAccessKey: this.configService.getAWSRekognitionSecretKey(),
      },
    });

    // us-east-1 = to use detectLabels and detectText features which are not supported in ca-central-1(default)
    this.rekognitionUsEastOne = new RekognitionClient({
      apiVersion: 'latest',
      region: this.configService.getUsEastOneAwsRegion(),
      credentials: {
        accessKeyId: this.configService.getAWSRekognitionAccessID(),
        secretAccessKey: this.configService.getAWSRekognitionSecretKey(),
      },
    });
  }

  async verifyUser(verificationId: string) {
    try {
      const verification =
        await this.verificationCollection.findById(verificationId);
      // TODO handle case one user multiple verified accounts in future
      if (verification) {
        const photoIdDetails = this.parseS3Uri(verification.photoIdS3URI);
        const selfieDetails = this.parseS3Uri(verification.selfieS3URI);

        // verify images before comparing
        const photoIdImage = await this.s3Service.downloadFile(
          photoIdDetails.bucketName,
          photoIdDetails.objectKey,
        );

        const selfieImage = await this.s3Service.downloadFile(
          selfieDetails.bucketName,
          selfieDetails.objectKey,
        );

        const isPhotoId = this._isPhotoId(
          await this._classifyImage(photoIdImage),
        );

        const isSelfie = this._isSelfie(await this._classifyImage(selfieImage));

        if (isPhotoId && isSelfie) {
          // create compare face request and compare face
          // Source = photoId
          // target = selfie

          const compareFacesRequest: CompareFacesRequest = {
            SourceImage: {
              S3Object: {
                Bucket: photoIdDetails.bucketName,
                Name: photoIdDetails.objectKey,
              },
            },
            TargetImage: {
              S3Object: {
                Bucket: selfieDetails.bucketName,
                Name: selfieDetails.objectKey,
              },
            },
            SimilarityThreshold: 90,
            QualityFilter: 'AUTO',
          };

          const verificationResponse = await this.rekognitionDefault.send(
            new CompareFacesCommand(compareFacesRequest),
          );

          // unmatched response
          // 2024-02-04 08:47:57 {
          //   2024-02-04 08:47:57   "$metadata": {
          //     2024-02-04 08:47:57     "httpStatusCode": 200,
          //     2024-02-04 08:47:57     "requestId": "f47edc65-18e3-4f6d-9d45-d3181768552f",
          //     2024-02-04 08:47:57     "attempts": 1,
          //     2024-02-04 08:47:57     "totalRetryDelay": 0
          //     2024-02-04 08:47:57   },
          //   2024-02-04 08:47:57   "FaceMatches": [],
          //   2024-02-04 08:47:57   "SourceImageFace": {
          //     2024-02-04 08:47:57     "BoundingBox": {
          //       2024-02-04 08:47:57       "Height": 0.5652076601982117,
          //       2024-02-04 08:47:57       "Left": 0.2196497917175293,
          //       2024-02-04 08:47:57       "Top": 0.2244158834218979,
          //       2024-02-04 08:47:57       "Width": 0.5616508722305298
          //       2024-02-04 08:47:57     },
          //     2024-02-04 08:47:57     "Confidence": 99.99996185302734
          //     2024-02-04 08:47:57   },
          //   2024-02-04 08:47:57   "UnmatchedFaces": [
          //     2024-02-04 08:47:57     {
          //     2024-02-04 08:47:57       "BoundingBox": {
          //       2024-02-04 08:47:57         "Height": 0.19453932344913483,
          //       2024-02-04 08:47:57         "Left": 0.4778270721435547,
          //       2024-02-04 08:47:57         "Top": 0.3939744830131531,
          //       2024-02-04 08:47:57         "Width": 0.20282311737537384
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Confidence": 99.99942779541016,
          //     2024-02-04 08:47:57       "Landmarks": [
          //       2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeLeft",
          //       2024-02-04 08:47:57           "X": 0.5464524626731873,
          //       2024-02-04 08:47:57           "Y": 0.45964521169662476
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeRight",
          //       2024-02-04 08:47:57           "X": 0.63517165184021,
          //       2024-02-04 08:47:57           "Y": 0.46185481548309326
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthLeft",
          //       2024-02-04 08:47:57           "X": 0.5525693893432617,
          //       2024-02-04 08:47:57           "Y": 0.5326892137527466
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthRight",
          //       2024-02-04 08:47:57           "X": 0.6266452074050903,
          //       2024-02-04 08:47:57           "Y": 0.5344386100769043
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "nose",
          //       2024-02-04 08:47:57           "X": 0.5994507074356079,
          //       2024-02-04 08:47:57           "Y": 0.4930599331855774
          //       2024-02-04 08:47:57         }
          //     2024-02-04 08:47:57       ],
          //     2024-02-04 08:47:57       "Pose": {
          //       2024-02-04 08:47:57         "Pitch": 11.794695854187012,
          //       2024-02-04 08:47:57         "Roll": 1.9025923013687134,
          //       2024-02-04 08:47:57         "Yaw": 7.088943958282471
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Quality": {
          //       2024-02-04 08:47:57         "Brightness": 64.1314697265625,
          //       2024-02-04 08:47:57         "Sharpness": 32.20803451538086
          //       2024-02-04 08:47:57       }
          //     2024-02-04 08:47:57     },
          //   2024-02-04 08:47:57     {
          //     2024-02-04 08:47:57       "BoundingBox": {
          //       2024-02-04 08:47:57         "Height": 0.07332473993301392,
          //       2024-02-04 08:47:57         "Left": 0.3888871371746063,
          //       2024-02-04 08:47:57         "Top": 0.5125100016593933,
          //       2024-02-04 08:47:57         "Width": 0.06481032073497772
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Confidence": 99.98088836669922,
          //     2024-02-04 08:47:57       "Landmarks": [
          //       2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeLeft",
          //       2024-02-04 08:47:57           "X": 0.3958345651626587,
          //       2024-02-04 08:47:57           "Y": 0.5395002365112305
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeRight",
          //       2024-02-04 08:47:57           "X": 0.41315123438835144,
          //       2024-02-04 08:47:57           "Y": 0.5406671166419983
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthLeft",
          //       2024-02-04 08:47:57           "X": 0.3961581885814667,
          //       2024-02-04 08:47:57           "Y": 0.5638079047203064
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthRight",
          //       2024-02-04 08:47:57           "X": 0.4104056656360626,
          //       2024-02-04 08:47:57           "Y": 0.5649895668029785
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "nose",
          //       2024-02-04 08:47:57           "X": 0.3893558382987976,
          //       2024-02-04 08:47:57           "Y": 0.5525203943252563
          //       2024-02-04 08:47:57         }
          //     2024-02-04 08:47:57       ],
          //     2024-02-04 08:47:57       "Pose": {
          //       2024-02-04 08:47:57         "Pitch": -27.765169143676758,
          //       2024-02-04 08:47:57         "Roll": 22.59857940673828,
          //       2024-02-04 08:47:57         "Yaw": -47.9415168762207
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Quality": {
          //       2024-02-04 08:47:57         "Brightness": 61.5956916809082,
          //       2024-02-04 08:47:57         "Sharpness": 4.3748369216918945
          //       2024-02-04 08:47:57       }
          //     2024-02-04 08:47:57     },
          //   2024-02-04 08:47:57     {
          //     2024-02-04 08:47:57       "BoundingBox": {
          //       2024-02-04 08:47:57         "Height": 0.06400097161531448,
          //       2024-02-04 08:47:57         "Left": 0.13089829683303833,
          //       2024-02-04 08:47:57         "Top": 0.4953811466693878,
          //       2024-02-04 08:47:57         "Width": 0.06572766602039337
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Confidence": 99.98030090332031,
          //     2024-02-04 08:47:57       "Landmarks": [
          //       2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeLeft",
          //       2024-02-04 08:47:57           "X": 0.16794991493225098,
          //       2024-02-04 08:47:57           "Y": 0.5232643485069275
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeRight",
          //       2024-02-04 08:47:57           "X": 0.18855232000350952,
          //       2024-02-04 08:47:57           "Y": 0.5153037905693054
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthLeft",
          //       2024-02-04 08:47:57           "X": 0.17357605695724487,
          //       2024-02-04 08:47:57           "Y": 0.5481494665145874
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthRight",
          //       2024-02-04 08:47:57           "X": 0.19079351425170898,
          //       2024-02-04 08:47:57           "Y": 0.5411945581436157
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "nose",
          //       2024-02-04 08:47:57           "X": 0.19590234756469727,
          //       2024-02-04 08:47:57           "Y": 0.5352548360824585
          //       2024-02-04 08:47:57         }
          //     2024-02-04 08:47:57       ],
          //     2024-02-04 08:47:57       "Pose": {
          //       2024-02-04 08:47:57         "Pitch": -37.34552001953125,
          //       2024-02-04 08:47:57         "Roll": -26.846832275390625,
          //       2024-02-04 08:47:57         "Yaw": 41.49032974243164
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Quality": {
          //       2024-02-04 08:47:57         "Brightness": 45.879722595214844,
          //       2024-02-04 08:47:57         "Sharpness": 3.3018569946289062
          //       2024-02-04 08:47:57       }
          //     2024-02-04 08:47:57     },
          //   2024-02-04 08:47:57     {
          //     2024-02-04 08:47:57       "BoundingBox": {
          //       2024-02-04 08:47:57         "Height": 0.07243912667036057,
          //       2024-02-04 08:47:57         "Left": 0.9031824469566345,
          //       2024-02-04 08:47:57         "Top": 0.5973696112632751,
          //       2024-02-04 08:47:57         "Width": 0.07739639282226562
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Confidence": 99.98904418945312,
          //     2024-02-04 08:47:57       "Landmarks": [
          //       2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeLeft",
          //       2024-02-04 08:47:57           "X": 0.9280309081077576,
          //       2024-02-04 08:47:57           "Y": 0.6241000294685364
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeRight",
          //       2024-02-04 08:47:57           "X": 0.9577877521514893,
          //       2024-02-04 08:47:57           "Y": 0.6288094520568848
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthLeft",
          //       2024-02-04 08:47:57           "X": 0.9236437082290649,
          //       2024-02-04 08:47:57           "Y": 0.648980438709259
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthRight",
          //       2024-02-04 08:47:57           "X": 0.9484605193138123,
          //       2024-02-04 08:47:57           "Y": 0.6529006361961365
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "nose",
          //       2024-02-04 08:47:57           "X": 0.9390228390693665,
          //       2024-02-04 08:47:57           "Y": 0.639808714389801
          //       2024-02-04 08:47:57         }
          //     2024-02-04 08:47:57       ],
          //     2024-02-04 08:47:57       "Pose": {
          //       2024-02-04 08:47:57         "Pitch": 1.3907692432403564,
          //       2024-02-04 08:47:57         "Roll": 11.900054931640625,
          //       2024-02-04 08:47:57         "Yaw": 0.7242305874824524
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Quality": {
          //       2024-02-04 08:47:57         "Brightness": 53.819091796875,
          //       2024-02-04 08:47:57         "Sharpness": 3.3018569946289062
          //       2024-02-04 08:47:57       }
          //     2024-02-04 08:47:57     },
          //   2024-02-04 08:47:57     {
          //     2024-02-04 08:47:57       "BoundingBox": {
          //       2024-02-04 08:47:57         "Height": 0.07613091915845871,
          //       2024-02-04 08:47:57         "Left": 0.04759550094604492,
          //       2024-02-04 08:47:57         "Top": 0.5182799696922302,
          //       2024-02-04 08:47:57         "Width": 0.06442447006702423
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Confidence": 99.84098815917969,
          //     2024-02-04 08:47:57       "Landmarks": [
          //       2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeLeft",
          //       2024-02-04 08:47:57           "X": 0.09259583801031113,
          //       2024-02-04 08:47:57           "Y": 0.5493391156196594
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "eyeRight",
          //       2024-02-04 08:47:57           "X": 0.1005377545952797,
          //       2024-02-04 08:47:57           "Y": 0.5516618490219116
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthLeft",
          //       2024-02-04 08:47:57           "X": 0.08301302790641785,
          //       2024-02-04 08:47:57           "Y": 0.5752705931663513
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "mouthRight",
          //       2024-02-04 08:47:57           "X": 0.08941444754600525,
          //       2024-02-04 08:47:57           "Y": 0.5768762826919556
          //       2024-02-04 08:47:57         },
          //     2024-02-04 08:47:57         {
          //       2024-02-04 08:47:57           "Type": "nose",
          //       2024-02-04 08:47:57           "X": 0.10844815522432327,
          //       2024-02-04 08:47:57           "Y": 0.5672525763511658
          //       2024-02-04 08:47:57         }
          //     2024-02-04 08:47:57       ],
          //     2024-02-04 08:47:57       "Pose": {
          //       2024-02-04 08:47:57         "Pitch": -19.493206024169922,
          //       2024-02-04 08:47:57         "Roll": 8.384119033813477,
          //       2024-02-04 08:47:57         "Yaw": 73.05221557617188
          //       2024-02-04 08:47:57       },
          //     2024-02-04 08:47:57       "Quality": {
          //       2024-02-04 08:47:57         "Brightness": 33.902347564697266,
          //       2024-02-04 08:47:57         "Sharpness": 4.3748369216918945
          //       2024-02-04 08:47:57       }
          //     2024-02-04 08:47:57     }
          //   2024-02-04 08:47:57   ]
          //   2024-02-04 08:47:57 }

          // Matched response
          // 2024-02-04 08:51:21 {
          //   2024-02-04 08:51:21   "$metadata": {
          //     2024-02-04 08:51:21     "httpStatusCode": 200,
          //     2024-02-04 08:51:21     "requestId": "2df5f0c2-d614-4afa-887e-ac6b893c7dc1",
          //     2024-02-04 08:51:21     "attempts": 1,
          //     2024-02-04 08:51:21     "totalRetryDelay": 0
          //     2024-02-04 08:51:21   },
          //   2024-02-04 08:51:21   "FaceMatches": [
          //     2024-02-04 08:51:21     {
          //     2024-02-04 08:51:21       "Face": {
          //       2024-02-04 08:51:21         "BoundingBox": {
          //         2024-02-04 08:51:21           "Height": 0.20760369300842285,
          //         2024-02-04 08:51:21           "Left": 0.33941295742988586,
          //         2024-02-04 08:51:21           "Top": 0.4423432946205139,
          //         2024-02-04 08:51:21           "Width": 0.26998862624168396
          //         2024-02-04 08:51:21         },
          //       2024-02-04 08:51:21         "Confidence": 99.99732971191406,
          //       2024-02-04 08:51:21         "Landmarks": [
          //         2024-02-04 08:51:21           {
          //         2024-02-04 08:51:21             "Type": "eyeLeft",
          //         2024-02-04 08:51:21             "X": 0.41517171263694763,
          //         2024-02-04 08:51:21             "Y": 0.5201154947280884
          //         2024-02-04 08:51:21           },
          //       2024-02-04 08:51:21           {
          //         2024-02-04 08:51:21             "Type": "eyeRight",
          //         2024-02-04 08:51:21             "X": 0.5335614681243896,
          //         2024-02-04 08:51:21             "Y": 0.5255076885223389
          //         2024-02-04 08:51:21           },
          //       2024-02-04 08:51:21           {
          //         2024-02-04 08:51:21             "Type": "mouthLeft",
          //         2024-02-04 08:51:21             "X": 0.41783568263053894,
          //         2024-02-04 08:51:21             "Y": 0.5863147974014282
          //         2024-02-04 08:51:21           },
          //       2024-02-04 08:51:21           {
          //         2024-02-04 08:51:21             "Type": "mouthRight",
          //         2024-02-04 08:51:21             "X": 0.5174911618232727,
          //         2024-02-04 08:51:21             "Y": 0.5909372568130493
          //         2024-02-04 08:51:21           },
          //       2024-02-04 08:51:21           {
          //         2024-02-04 08:51:21             "Type": "nose",
          //         2024-02-04 08:51:21             "X": 0.4702453017234802,
          //         2024-02-04 08:51:21             "Y": 0.5676804780960083
          //         2024-02-04 08:51:21           }
          //       2024-02-04 08:51:21         ],
          //       2024-02-04 08:51:21         "Pose": {
          //         2024-02-04 08:51:21           "Pitch": -12.03082275390625,
          //         2024-02-04 08:51:21           "Roll": 2.7762486934661865,
          //         2024-02-04 08:51:21           "Yaw": 2.8718910217285156
          //         2024-02-04 08:51:21         },
          //       2024-02-04 08:51:21         "Quality": {
          //         2024-02-04 08:51:21           "Brightness": 59.92759323120117,
          //         2024-02-04 08:51:21           "Sharpness": 60.49041748046875
          //         2024-02-04 08:51:21         }
          //       2024-02-04 08:51:21       },
          //     2024-02-04 08:51:21       "Similarity": 99.99808502197266
          //     2024-02-04 08:51:21     }
          //   2024-02-04 08:51:21   ],
          //   2024-02-04 08:51:21   "SourceImageFace": {
          //     2024-02-04 08:51:21     "BoundingBox": {
          //       2024-02-04 08:51:21       "Height": 0.5652076601982117,
          //       2024-02-04 08:51:21       "Left": 0.2196497917175293,
          //       2024-02-04 08:51:21       "Top": 0.2244158834218979,
          //       2024-02-04 08:51:21       "Width": 0.5616508722305298
          //       2024-02-04 08:51:21     },
          //     2024-02-04 08:51:21     "Confidence": 99.99996185302734
          //     2024-02-04 08:51:21   },
          //   2024-02-04 08:51:21   "UnmatchedFaces": []
          //   2024-02-04 08:51:21 }

          const verificationResponseString =
            JSON.stringify(verificationResponse);
          const { FaceMatches, UnmatchedFaces } = verificationResponse;
          let userVerifiedStatus = '';
          if (FaceMatches.length) {
            userVerifiedStatus = VerificationStatus.Verified;
          } else if (UnmatchedFaces) {
            userVerifiedStatus = VerificationStatus.NotVerified;
          } else {
            userVerifiedStatus = VerificationStatus.Failed;
          }

          await this.verificationCollection.findByIdAndUpdate(
            verificationId,
            {
              status: userVerifiedStatus,
              verificationResponseFromAws: verificationResponseString,
              verificationFailedReason:
                userVerifiedStatus === VerificationStatus.NotVerified
                  ? 'selfie and PhotoId not Matching'
                  : '',
            },
            { new: true },
          );

          if (userVerifiedStatus === VerificationStatus.Verified) {
            // send SNS event only if user is verified
            // SNS event
            await this.snsService.publishUserFaceVerifiedEvent(
              verification.userId,
              verification.id,
            );
          }

          this.logger.log(
            'User Face Verification Completed',
            `Verification-status: ${userVerifiedStatus}`,
          );
        } else {
          let verificationFailedReason = '';
          if (!isPhotoId) {
            verificationFailedReason = 'not a valid photoId';
          }
          if (!isSelfie) {
            verificationFailedReason = 'not a valid selfie';
          }

          // update the failed reason and status to
          await this.verificationCollection.findByIdAndUpdate(
            verificationId,
            {
              status: VerificationStatus.Failed,
              verificationFailedReason,
            },
            { new: true },
          );

          this.logger.log(
            'User Face Verification Completed',
            `Verification-status: ${VerificationStatus.Failed}`,
            `Failed Reason: ${verificationFailedReason}`,
          );
        }
      } else return 'Verification Details not Found';
    } catch (error) {
      // If any error make verification status as failed - so user can request new verification
      await this.verificationCollection.findByIdAndUpdate(verificationId, {
        status: VerificationStatus.Failed,
        verificationFailedReason: 'Server Error',
      });
      this.logger.error('verifyUser-rekognition-error', error);
      throw error;
    }
  }

  private async _classifyImage(image: Uint8Array) {
    try {
      const detectLabelsRequest: DetectLabelsRequest = {
        Image: {
          Bytes: image,
        },
        MaxLabels: 10,
        Features: ['GENERAL_LABELS'],
      };
      const detectLabelResponse = await this.rekognitionUsEastOne.send(
        new DetectLabelsCommand(detectLabelsRequest),
      );
      return detectLabelResponse;
    } catch (error) {
      this.logger.error('classifyImage-error', error.name, error, error.code);
      throw error;
    }
  }

  private parseS3Uri(s3Uri: string) {
    // Example s3Uri: s3://ride-off-verification-service/65bf775b50c5a2fd1404557b/verification/65bf77fed4c1e67887788a8b/images/selfie.jpg
    const [, , bucketName, ...rest] = s3Uri.split('/');
    const objectKey = rest.join('/');
    return { bucketName, objectKey };
  }

  private _isPhotoId(response: DetectLabelsCommandOutput): boolean {
    // PhotoId response from classifyImage
    // 2024-02-05 03:06:29 {
    //   2024-02-05 03:06:29   "$metadata": {
    //     2024-02-05 03:06:29     "httpStatusCode": 200,
    //     2024-02-05 03:06:29     "requestId": "83a21e55-7182-4b45-a515-ae2afff8ca93",
    //     2024-02-05 03:06:29     "attempts": 1,
    //     2024-02-05 03:06:29     "totalRetryDelay": 0
    //     2024-02-05 03:06:29   },
    //   2024-02-05 03:06:29   "LabelModelVersion": "3.0",
    //   2024-02-05 03:06:29   "Labels": [
    //     2024-02-05 03:06:29     {
    //     2024-02-05 03:06:29       "Aliases": [],
    //     2024-02-05 03:06:29       "Categories": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Text and Documents"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ],
    //     2024-02-05 03:06:29       "Confidence": 99.99993896484375,
    //     2024-02-05 03:06:29       "Instances": [],
    //     2024-02-05 03:06:29       "Name": "Text",
    //     2024-02-05 03:06:29       "Parents": []
    //     2024-02-05 03:06:29     },
    //   2024-02-05 03:06:29     {
    //     2024-02-05 03:06:29       "Aliases": [],
    //     2024-02-05 03:06:29       "Categories": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Text and Documents"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ],
    //     2024-02-05 03:06:29       "Confidence": 98.69269561767578,
    //     2024-02-05 03:06:29       "Instances": [],
    //     2024-02-05 03:06:29       "Name": "Document",
    //     2024-02-05 03:06:29       "Parents": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Text"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ]
    //     2024-02-05 03:06:29     },
    //   2024-02-05 03:06:29     {
    //     2024-02-05 03:06:29       "Aliases": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "License"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ],
    //     2024-02-05 03:06:29       "Categories": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Text and Documents"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ],
    //     2024-02-05 03:06:29       "Confidence": 93.22456359863281,
    //     2024-02-05 03:06:29       "Instances": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "BoundingBox": {
    //         2024-02-05 03:06:29             "Height": 0.8990384936332703,
    //         2024-02-05 03:06:29             "Left": 0.036373063921928406,
    //         2024-02-05 03:06:29             "Top": 0.05854077637195587,
    //         2024-02-05 03:06:29             "Width": 0.4608438014984131
    //         2024-02-05 03:06:29           },
    //       2024-02-05 03:06:29           "Confidence": 91.04218292236328
    //       2024-02-05 03:06:29         },
    //     2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "BoundingBox": {
    //         2024-02-05 03:06:29             "Height": 0.882985532283783,
    //         2024-02-05 03:06:29             "Left": 0.529999315738678,
    //         2024-02-05 03:06:29             "Top": 0.08470536023378372,
    //         2024-02-05 03:06:29             "Width": 0.45730119943618774
    //         2024-02-05 03:06:29           },
    //       2024-02-05 03:06:29           "Confidence": 89.00233459472656
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ],
    //     2024-02-05 03:06:29       "Name": "Driving License",
    //     2024-02-05 03:06:29       "Parents": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Document"
    //       2024-02-05 03:06:29         },
    //     2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Id Cards"
    //       2024-02-05 03:06:29         },
    //     2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Text"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ]
    //     2024-02-05 03:06:29     },
    //   2024-02-05 03:06:29     {
    //     2024-02-05 03:06:29       "Aliases": [],
    //     2024-02-05 03:06:29       "Categories": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Text and Documents"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ],
    //     2024-02-05 03:06:29       "Confidence": 93.22456359863281,
    //     2024-02-05 03:06:29       "Instances": [],
    //     2024-02-05 03:06:29       "Name": "Id Cards",
    //     2024-02-05 03:06:29       "Parents": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Document"
    //       2024-02-05 03:06:29         },
    //     2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Text"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ]
    //     2024-02-05 03:06:29     },
    //   2024-02-05 03:06:29     {
    //     2024-02-05 03:06:29       "Aliases": [],
    //     2024-02-05 03:06:29       "Categories": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "Name": "Technology and Computing"
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ],
    //     2024-02-05 03:06:29       "Confidence": 85.37284851074219,
    //     2024-02-05 03:06:29       "Instances": [
    //       2024-02-05 03:06:29         {
    //       2024-02-05 03:06:29           "BoundingBox": {
    //         2024-02-05 03:06:29             "Height": 0.21024006605148315,
    //         2024-02-05 03:06:29             "Left": 0.37590929865837097,
    //         2024-02-05 03:06:29             "Top": 0.6744943857192993,
    //         2024-02-05 03:06:29             "Width": 0.07059872150421143
    //         2024-02-05 03:06:29           },
    //       2024-02-05 03:06:29           "Confidence": 85.37284851074219
    //       2024-02-05 03:06:29         }
    //     2024-02-05 03:06:29       ],
    //     2024-02-05 03:06:29       "Name": "QR Code",
    //     2024-02-05 03:06:29       "Parents": []
    //     2024-02-05 03:06:29     }
    //   2024-02-05 03:06:29   ]
    //   2024-02-05 03:06:29 }

    // TODO update for actual photoId
    const photoIdLabels = new Set(['id cards', 'license', 'driving license']);
    if (!response.Labels || !Array.isArray(response.Labels)) return false;

    for (const label of response.Labels) {
      if (
        label.Categories.some(
          (category) =>
            category.Name === 'Text and Documents' || category.Name === 'Text',
        )
      ) {
        if (photoIdLabels.has(label.Name.toLowerCase())) return true;
      }
    }
    return false;
  }

  private _isSelfie(response: DetectLabelsCommandOutput): boolean {
    // Selfie Response from classifyImage:
    // 2024-02-05 03:06:30 {
    //   2024-02-05 03:06:30   "$metadata": {
    //     2024-02-05 03:06:30     "httpStatusCode": 200,
    //     2024-02-05 03:06:30     "requestId": "66651cec-ac75-404d-a28e-0547ab4c9f69",
    //     2024-02-05 03:06:30     "attempts": 1,
    //     2024-02-05 03:06:30     "totalRetryDelay": 0
    //     2024-02-05 03:06:30   },
    //   2024-02-05 03:06:30   "LabelModelVersion": "3.0",
    //   2024-02-05 03:06:30   "Labels": [
    //     2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person Description"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.99976348876953,
    //     2024-02-05 03:06:30       "Instances": [],
    //     2024-02-05 03:06:30       "Name": "Head",
    //     2024-02-05 03:06:30       "Parents": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ]
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Human"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person Description"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.99976348876953,
    //     2024-02-05 03:06:30       "Instances": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "BoundingBox": {
    //         2024-02-05 03:06:30             "Height": 0.9548309445381165,
    //         2024-02-05 03:06:30             "Left": 0.00010421752813272178,
    //         2024-02-05 03:06:30             "Top": 0.043428823351860046,
    //         2024-02-05 03:06:30             "Width": 0.999808669090271
    //         2024-02-05 03:06:30           },
    //       2024-02-05 03:06:30           "Confidence": 99.81009674072266
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Name": "Person",
    //     2024-02-05 03:06:30       "Parents": []
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person Description"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.99964141845703,
    //     2024-02-05 03:06:30       "Instances": [],
    //     2024-02-05 03:06:30       "Name": "Face",
    //     2024-02-05 03:06:30       "Parents": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Head"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ]
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Photo"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Hobbies and Interests"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.9996337890625,
    //     2024-02-05 03:06:30       "Instances": [],
    //     2024-02-05 03:06:30       "Name": "Photography",
    //     2024-02-05 03:06:30       "Parents": []
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Hobbies and Interests"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.9996337890625,
    //     2024-02-05 03:06:30       "Instances": [],
    //     2024-02-05 03:06:30       "Name": "Portrait",
    //     2024-02-05 03:06:30       "Parents": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Face"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Head"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Photography"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ]
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person Description"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.97655487060547,
    //     2024-02-05 03:06:30       "Instances": [],
    //     2024-02-05 03:06:30       "Name": "Beard",
    //     2024-02-05 03:06:30       "Parents": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Face"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Head"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ]
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person Description"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.81009674072266,
    //     2024-02-05 03:06:30       "Instances": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "BoundingBox": {
    //         2024-02-05 03:06:30             "Height": 0.9548309445381165,
    //         2024-02-05 03:06:30             "Left": 0.00010421752813272178,
    //         2024-02-05 03:06:30             "Top": 0.043428823351860046,
    //         2024-02-05 03:06:30             "Width": 0.999808669090271
    //         2024-02-05 03:06:30           },
    //       2024-02-05 03:06:30           "Confidence": 99.81009674072266
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Name": "Adult",
    //     2024-02-05 03:06:30       "Parents": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ]
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person Description"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.81009674072266,
    //     2024-02-05 03:06:30       "Instances": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "BoundingBox": {
    //         2024-02-05 03:06:30             "Height": 0.9548309445381165,
    //         2024-02-05 03:06:30             "Left": 0.00010421752813272178,
    //         2024-02-05 03:06:30             "Top": 0.043428823351860046,
    //         2024-02-05 03:06:30             "Width": 0.999808669090271
    //         2024-02-05 03:06:30           },
    //       2024-02-05 03:06:30           "Confidence": 99.81009674072266
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Name": "Male",
    //     2024-02-05 03:06:30       "Parents": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ]
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person Description"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 99.81009674072266,
    //     2024-02-05 03:06:30       "Instances": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "BoundingBox": {
    //         2024-02-05 03:06:30             "Height": 0.9548309445381165,
    //         2024-02-05 03:06:30             "Left": 0.00010421752813272178,
    //         2024-02-05 03:06:30             "Top": 0.043428823351860046,
    //         2024-02-05 03:06:30             "Width": 0.999808669090271
    //         2024-02-05 03:06:30           },
    //       2024-02-05 03:06:30           "Confidence": 99.81009674072266
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Name": "Man",
    //     2024-02-05 03:06:30       "Parents": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Adult"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Male"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ]
    //     2024-02-05 03:06:30     },
    //   2024-02-05 03:06:30     {
    //     2024-02-05 03:06:30       "Aliases": [],
    //     2024-02-05 03:06:30       "Categories": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person Description"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ],
    //     2024-02-05 03:06:30       "Confidence": 81.86238098144531,
    //     2024-02-05 03:06:30       "Instances": [],
    //     2024-02-05 03:06:30       "Name": "Neck",
    //     2024-02-05 03:06:30       "Parents": [
    //       2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Body Part"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Face"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Head"
    //       2024-02-05 03:06:30         },
    //     2024-02-05 03:06:30         {
    //       2024-02-05 03:06:30           "Name": "Person"
    //       2024-02-05 03:06:30         }
    //     2024-02-05 03:06:30       ]
    //     2024-02-05 03:06:30     }
    //   2024-02-05 03:06:30   ]
    //   2024-02-05 03:06:30 }

    // TODO update for actual selfie
    const selfieLabels = new Set([
      'head',
      'person',
      'face',
      'portrait',
      'beard',
      'adult',
      'male',
      'female',
      'man',
      'boy',
      'women',
      'girl',
      'neck',
    ]);
    if (!response.Labels || !Array.isArray(response.Labels)) return false;

    for (const label of response.Labels) {
      if (
        label.Categories.some(
          (category) => category.Name === 'Person Description',
        )
      ) {
        if (selfieLabels.has(label.Name.toLowerCase())) return true;
      }
    }
  }
}
