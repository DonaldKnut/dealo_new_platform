import { SetMetadata } from '@nestjs/common';

export const VERIFIED_EMAIL_KEY = 'requireVerifiedEmail';
/** Route sends email to other people, so the signed-in user must have confirmed their own address. */
export const RequireVerifiedEmail = () => SetMetadata(VERIFIED_EMAIL_KEY, true);
