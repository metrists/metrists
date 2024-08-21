import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { describe, expect, it, afterEach, beforeEach } from '@jest/globals';
import execa = require('execa');

const timeout = 10000;

describe('', () => {
  const temp = join(__dirname, 'tmp');
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(temp, `test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(temp, { recursive: true, force: true });
  }, timeout);

  it(
    'should create a .metrists directory after running the init command',
    async () => {
      const markdownFilePath = join(tempDir, 'test.md');
      writeFileSync(markdownFilePath, '# Test Markdown File', 'utf-8');

      await execa('node', ['../../../../dist/bin/metrists.js', 'init'], {
        cwd: tempDir,
      });

      const metristsDirPath = join(tempDir, '.metrists');
      const directoryExists = existsSync(metristsDirPath);

      expect(directoryExists).toBe(true);
    },
    timeout,
  );
});
