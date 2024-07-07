import { execFile } from 'child_process';

const commands = (): [string, string[]?] => {
  const { platform } = process;
  switch (platform) {
    case 'android':
    case 'linux':
      return ['xdg-open'];
    case 'darwin':
      return ['open'];
    case 'win32':
      return ['cmd', ['/c', 'start']];
    default:
      throw new Error(`Platform ${platform} isn't supported.`);
  }
};

export function open(url: string) {
  const [command, args = []] = commands();
  execFile(command, [...args, encodeURI(url)]);
}
