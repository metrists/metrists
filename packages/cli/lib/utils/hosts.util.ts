interface Host {
  configFileName: string;
  getConfigFileContent: ({
    outDir,
    command,
  }: {
    outDir: string;
    command: string;
  }) => string;
}

type SupportedHosts = 'netlify' | 'vercel' | 'nixpacks';

export const hostHelpers: Record<SupportedHosts, Host> = {
  netlify: {
    configFileName: 'netlify.toml',
    getConfigFileContent: ({ outDir, command }) => `[build]
publish = "${outDir}"
command = "${command}"
`,
  },
  vercel: {
    configFileName: 'vercel.json',
    getConfigFileContent: ({ outDir, command }) =>
      JSON.stringify({
        'buildCommand': command,
        'outputDirectory': outDir,
      }),
  },
  nixpacks: {
    configFileName: 'nixpacks.toml',
    getConfigFileContent: ({ outDir, command }) => `providers = ['node']

[phases.build]
cmds = ['${command}']

[start]
cmd = 'cd ${outDir} && npx serve -s'

`,
  },
};

export function getHostHelper(host: keyof typeof hostHelpers) {
  return hostHelpers[host];
}
