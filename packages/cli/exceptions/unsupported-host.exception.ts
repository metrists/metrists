import { BaseException } from './base.exception';

export class UnsupportedHostException extends BaseException {
  public override MESSAGE_TITLE = 'UNSUPPORTED_HOST' as const;
}
