// tests/unit/logger.test.ts — level-suppression tests for logger

import { createLogger } from '../../logger';

describe('createLogger', () => {
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy  = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy  = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('at level "debug"', () => {
    it('outputs debug, info, warn, error', () => {
      const log = createLogger('debug');
      log.debug('d');
      log.info('i');
      log.warn('w');
      log.error('e');
      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('at level "info"', () => {
    it('suppresses debug', () => {
      const log = createLogger('info');
      log.debug('d');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('outputs info, warn, error', () => {
      const log = createLogger('info');
      log.info('i');
      log.warn('w');
      log.error('e');
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('at level "warn"', () => {
    it('suppresses debug and info', () => {
      const log = createLogger('warn');
      log.debug('d');
      log.info('i');
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('outputs warn and error', () => {
      const log = createLogger('warn');
      log.warn('w');
      log.error('e');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('at level "error"', () => {
    it('suppresses debug, info, and warn', () => {
      const log = createLogger('error');
      log.debug('d');
      log.info('i');
      log.warn('w');
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('outputs error', () => {
      const log = createLogger('error');
      log.error('e');
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('passes message and extra args through to console.log for info', () => {
    const log = createLogger('debug');
    log.info('hello', 'world');
    expect(infoSpy).toHaveBeenCalledWith('hello', 'world');
  });
});
