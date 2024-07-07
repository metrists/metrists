import { readFileInJsonIfExists } from './fs.util';

export interface IRcFileComplete {
  outDir: string;
  template: {
    repository: string;
    branch?: string;
  };
}

export type IRcFile = Partial<IRcFileComplete>;

export const RC_FILE_NAME = '.metristsrc';

export const DEFAULT_RC_FILE: IRcFileComplete = {
  outDir: '.metrists',
  template: {
    repository: 'https://github.com/metrists/metrists-default-theme',
  },
};

export async function readRcFile(...basePath: string[]) {
  return readFileInJsonIfExists<IRcFile>(...basePath, RC_FILE_NAME);
}
export type GetFieldValue<TData, TResult> = (data: TData) => TResult;

export type GetRcFieldValue<TData> = GetFieldValue<IRcFile, TData>;

export async function getConfigGetter(...basePath: string[]) {
  const data = await readRcFile(...basePath);

  function getConfig<TResult>(callback: GetRcFieldValue<TResult>, defaultValue?: TResult): TResult {
    return callback(data) ?? defaultValue ?? callback(DEFAULT_RC_FILE);
  }
  return getConfig;
}
