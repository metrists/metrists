import { spawn, type ChildProcess } from 'child_process';
import { gray } from 'chalk';
import type { Logger } from './logger.util';

type SpawnParams = Parameters<typeof spawn>;

function getDefaultOutHandler(logger) {
  return (data) => {
    logger.verbose(gray(data.toString()));
  };
}
function getDefaultErrHandler(logger) {
  return (data) => {
    logger.verbose(gray(data.toString()));
  };
}

export async function spawnAndWait(
  logger: Logger,
  command: SpawnParams[0],
  args: SpawnParams[1],
  cwd: Partial<SpawnParams[2]> = {},
  options?: {
    stdErrListener?: (
      data: Buffer,
      next: ReturnType<typeof getDefaultErrHandler>,
    ) => void;
    stdOutListener?: (
      data: Buffer,
      next: ReturnType<typeof getDefaultOutHandler>,
    ) => void;
  },
): Promise<ChildProcess> {
  const defaultErrHandler = getDefaultErrHandler(logger);
  const defaultOutHandler = getDefaultOutHandler(logger);
  const stdErrListener = options?.stdErrListener ?? defaultErrHandler;
  const stdOutListener = options?.stdOutListener ?? defaultOutHandler;

  const childProcess = spawn(command, args, {
    env: { ...process.env },
    shell: true,
    windowsHide: true,
    ...cwd,
  });

  childProcess.stderr.on('data', (data) =>
    stdErrListener(data, defaultErrHandler),
  );

  childProcess.stdout.on('data', (data) =>
    stdOutListener(data, defaultOutHandler),
  );

  return new Promise<ChildProcess>(async (res, rej) => {
    childProcess.on('exit', (code) => {
      if (code !== 0) {
        rej(childProcess);
      } else {
        res(childProcess);
      }
    });
  });
}
