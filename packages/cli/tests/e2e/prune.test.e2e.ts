import { describe, expect, it } from '@jest/globals';
import execa = require('execa');

describe('CLI Application E2E Tests', () => {
  it('should perform a specific task correctly', async () => {
    execa.commandSync('node ./dist/bin/metrists.js -h');
    // Assert the expected output
    expect('hi').toContain('h');
  });

  // Add more tests as needed
});
