import { BaseException } from './base.exception';

export class HostNotProvidedException extends BaseException {
  public override MESSAGE_TITLE = 'HOST_NOT_PROVIDED' as const;
}
