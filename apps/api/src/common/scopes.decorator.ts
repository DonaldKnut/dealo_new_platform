import { SetMetadata } from '@nestjs/common';
import type { ApiScope } from '@dealo/shared';

export const SCOPES_KEY = 'scopes';
export const RequireScopes = (...scopes: ApiScope[]) => SetMetadata(SCOPES_KEY, scopes);
