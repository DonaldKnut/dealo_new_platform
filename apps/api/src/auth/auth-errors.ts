import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthIssue, type AuthIssueCode } from '@dealo/shared';

export { AuthIssue, type AuthIssueCode };

export class AuthFlowException extends HttpException {
  readonly code: AuthIssueCode;

  constructor(code: AuthIssueCode, message: string, status: HttpStatus) {
    super({ statusCode: status, code, message }, status);
    this.code = code;
  }
}

export function authCodeOf(err: unknown): AuthIssueCode {
  if (err instanceof AuthFlowException) return err.code;
  if (err instanceof HttpException) {
    const body = err.getResponse();
    if (typeof body === 'object' && body && 'code' in body) {
      const code = String((body as { code: unknown }).code);
      if ((Object.values(AuthIssue) as string[]).includes(code)) return code as AuthIssueCode;
    }
  }
  return AuthIssue.OAUTH_FAILED;
}
