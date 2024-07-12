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

type SupportedHosts = 'netlify' | 'vercel' | 'cloudflare';

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
  cloudflare: {
    configFileName: 'wrangler.toml',
    getConfigFileContent: ({ outDir, command }) => `[build]  
command = "${command}"
`,
  },
};

export function getHostHelper(host: keyof typeof hostHelpers) {
  return hostHelpers[host];
}
