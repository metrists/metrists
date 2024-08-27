import { BaseException } from './base.exception';

export class ExampleDirectoryNotEmptyException extends BaseException {
  public override MESSAGE_TITLE = 'EXAMPLE_DIRECTORY_NOT_EMPTY' as const;
}
