import { spawn, type ChildProcess } from 'child_process';
import { gray } from 'chalk';

type SpawnParams = Parameters<typeof spawn>;

export async function spawnAndWait(
  command: SpawnParams[0],
  args: SpawnParams[1],
  cwd: Partial<SpawnParams[2]> = {},
  options?: {
    stdErrListener?: (data: Buffer) => void;
    stdOutListener?: (data: Buffer) => void;
  }
): Promise<ChildProcess> {
  const stdErrListener = options?.stdErrListener ?? ((data) => console.error(gray(data.toString())));
  const stdOutListener = options?.stdOutListener ?? ((data) => console.log(gray(data.toString())));

  const childProcess = spawn(command, args, {
    env: { ...process.env },
    shell: true,
    windowsHide: true,
    ...cwd,
  });

  childProcess.stderr.on('data', stdErrListener);

  childProcess.stdout.on('data', stdOutListener);

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
