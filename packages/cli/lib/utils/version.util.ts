import chalk = require('chalk');
import { engines } from '../../package.json';

export function ensureSupportedNodeVersion() {
  const range = engines.node;
  const currentVersion = process.version.slice(1); // Remove the "v" prefix
  const rangeParts = range.split(' ').filter(Boolean);
  let minCheck = true,
    maxCheck = true;

  rangeParts.forEach((part) => {
    if (part.startsWith('>=')) {
      const min = part.replace('>=', '');
      minCheck = minCheck && compareVersions(currentVersion, min) >= 0;
    } else if (part.startsWith('>')) {
      const min = part.replace('>', '');
      minCheck = minCheck && compareVersions(currentVersion, min) > 0;
    } else if (part.startsWith('<=')) {
      const max = part.replace('<=', '');
      maxCheck = maxCheck && compareVersions(currentVersion, max) <= 0;
    } else if (part.startsWith('<')) {
      const max = part.replace('<', '');
      maxCheck = maxCheck && compareVersions(currentVersion, max) < 0;
    }
  });
  if (!minCheck || !maxCheck) {
    console.error(
      chalk.red(
        `Error: Unsupported Node.js version. Please use a version ${
          rangeParts.length > 1
            ? `between ${rangeParts[0]} and ${rangeParts[1]}`
            : range
        }`,
      ),
    );
    process.exit(1);
  }
}

function compareVersions(v1, v2) {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }
  return 0;
}
