import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/migrations/**',
    '!src/scripts/**',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: [],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};

export default config;
