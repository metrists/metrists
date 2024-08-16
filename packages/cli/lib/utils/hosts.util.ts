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

const nixpacks = {
  configFileName: 'nixpacks.toml',
  getConfigFileContent: ({ outDir, command }) => `providers = ['node']

[phases.build]
cmds = ['${command}']

[start]
cmd = 'cd ${outDir} && npx serve -s'
`,
};

const vercel = {
  configFileName: 'vercel.json',
  getConfigFileContent: ({ outDir, command }) =>
    JSON.stringify({
      'buildCommand': command,
      'outputDirectory': outDir,
    }),
};

const netlify = {
  configFileName: 'netlify.toml',
  getConfigFileContent: ({ outDir, command }) => `[build]
publish = "${outDir}"
command = "${command}"
`,
};

export const hostHelpers: Record<string, Host> = {
  netlify,
  vercel,
  nixpacks,
  coolify: nixpacks,
  railway: nixpacks,
};

export function getHostHelper(host: keyof typeof hostHelpers) {
  return hostHelpers[host];
}

export function getSupportedHosts() {
  return Object.keys(hostHelpers);
}
