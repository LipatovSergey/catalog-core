export type NodeEnvironment = 'development' | 'test' | 'production';

export function getNodeEnvironment(): NodeEnvironment {
  const environment = process.env.NODE_ENV;

  if (
    environment !== 'development' &&
    environment !== 'test' &&
    environment !== 'production'
  ) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  return environment;
}
