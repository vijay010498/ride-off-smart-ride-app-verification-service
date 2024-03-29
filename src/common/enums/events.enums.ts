export enum Events {
  userCreatedByPhone = 'AUTH_USER_CREATED_BY_PHONE',
  userUpdated = 'AUTH_USER_UPDATED',
  tokenBlackList = 'AUTH_TOKEN_BLACKLIST',
  verifyUser = 'VERIFY_USER', // used only inside verification service
  userFaceVerified = 'VERIFY_USER_FACE_VERIFIED',
}
