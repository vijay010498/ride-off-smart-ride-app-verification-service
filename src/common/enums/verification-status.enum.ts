export enum VerificationStatus {
  Started = 'Started',
  Verified = 'Verified', // Face ID is successfully verified
  Failed = 'Failed', //  Verification failed for any reason - like server errors...
  NotVerified = 'Not Verified', // Face ID not verified - selfie and photoId not matching
}
