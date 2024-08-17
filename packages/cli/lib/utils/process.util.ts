import { spawn, type ChildProcess } from 'child_process';
import { gray } from 'chalk';

type SpawnParams = Parameters<typeof spawn>;

function defaultOutHandler(data) {
  console.error(gray(data.toString()));
}

function defaultErrHandler(data) {
  console.error(gray(data.toString()));
}

export async function spawnAndWait(
  command: SpawnParams[0],
  args: SpawnParams[1],
  cwd: Partial<SpawnParams[2]> = {},
  options?: {
    stdErrListener?: (data: Buffer, next: typeof defaultErrHandler) => void;
    stdOutListener?: (data: Buffer, next: typeof defaultOutHandler) => void;
  },
): Promise<ChildProcess> {
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
