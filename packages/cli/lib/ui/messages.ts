import { EMOJIS } from './emojis';

export const MESSAGES = {
  NO_ID_PASSED: `No id passed ${EMOJIS.EYES}`,
  UNSUPPORTED_HOST:
    'Host [host] is not supported. Supported hosts: [supportedHosts]',
  HOST_NOT_PROVIDED: 'No host provided. Supported hosts: [supportedHosts]',
  COULD_NOT_PARSE_FETCHER: 'Could not parse the output of your fetcher file.',
  COULD_NOT_CREATE_FILE: `Could not create file [path]. [error]`,
  ENTITIES_CREATED: `${EMOJIS.CHECK}  Basic entities created successfully.`,
  RC_FILE_NOT_FOUND: 'No .metristsrc file found  in [file_path]',
  EXAMPLE_DIRECTORY_NOT_EMPTY:
    'To use the example flag, the directory must be empty. If you wish to initialize the project in a non-empty directory, do not use the example flag.',
  DEFAULT: `Something went wrong ${EMOJIS.POOP}`,
  PARSE_BOOK_EXCEPTION: `Could not validate parse book. [error]`,
  AUTHOR_NOT_SAVED: `${EMOJIS.SMIRK}  Trying to create avatar for an author that is not saved yet. [author]`,
  MISSING_PARAMETER: `Required parameters [parameters] are missing ${EMOJIS.EYES}`,
  WATCH_MODE_START: `Starting Metrists in watch mode...`,
};
