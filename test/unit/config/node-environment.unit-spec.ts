import { getNodeEnvironment } from '../../../src/config/node-environment';

describe('getNodeEnvironment', () => {
  const originalNodeEnvironment = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnvironment;
    }
  });

  it.each(['development', 'test', 'production'] as const)(
    'accepts %s',
    (environment) => {
      process.env.NODE_ENV = environment;

      expect(getNodeEnvironment()).toBe(environment);
    },
  );

  it.each([undefined, '', 'staging'])('rejects %s', (environment) => {
    if (environment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = environment;
    }

    expect(() => getNodeEnvironment()).toThrow(
      'NODE_ENV must be development, test, or production',
    );
  });
});
