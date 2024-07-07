import { readFileInJsonIfExists } from './fs.util';

export interface ITemplateConfig {
  'contentPath': string;
  'assetsPath': string;
  'watchScript': string;
  'buildScript': string;
  'watchContentScript': string;
  'buildContentScript': string;
}

export const TEMPLATE_CONFIG_FILE_NAME = 'metrists.json';

export async function readConfigFile(...basePath: string[]) {
  return readFileInJsonIfExists<ITemplateConfig>(...basePath, TEMPLATE_CONFIG_FILE_NAME);
}
export type GetFieldValue<TData, TResult> = (data: TData) => TResult;

export type GetTemplateConfigFieldValue<TData> = GetFieldValue<ITemplateConfig, TData>;

export async function getConfigGetter(...basePath: string[]) {
  const data = await readConfigFile(...basePath);

  function getConfig<TResult>(
    callback: GetTemplateConfigFieldValue<TResult>,
    defaultValue?: TResult,
  ): TResult {
    return callback(data) ?? defaultValue;
  }
  return getConfig;
}
