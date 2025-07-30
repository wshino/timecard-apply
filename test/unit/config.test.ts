import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadConfig, defaultConfig } from '../../src/config';

describe('Config', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.CLOCK_IN_TIME;
    delete process.env.CLOCK_OUT_TIME;
    delete process.env.APPLICATION_REASON;
    delete process.env.HEADLESS;
    delete process.env.DEBUG;
  });

  describe('loadConfig', () => {
    it('should return default config when no custom config provided', () => {
      const config = loadConfig();
      expect(config).toEqual(defaultConfig);
    });

    it('should override with custom config', () => {
      const customConfig = {
        clockInTime: '0900',
        clockOutTime: '1800',
        headless: true,
      };
      
      const config = loadConfig(customConfig);
      
      expect(config.clockInTime).toBe('0900');
      expect(config.clockOutTime).toBe('1800');
      expect(config.headless).toBe(true);
      expect(config.applicationReason).toBe(defaultConfig.applicationReason);
    });

    it('should override with environment variables', () => {
      process.env.CLOCK_IN_TIME = '0930';
      process.env.CLOCK_OUT_TIME = '1830';
      process.env.APPLICATION_REASON = 'テスト';
      process.env.HEADLESS = 'true';
      process.env.DEBUG = 'true';
      
      const config = loadConfig();
      
      expect(config.clockInTime).toBe('0930');
      expect(config.clockOutTime).toBe('1830');
      expect(config.applicationReason).toBe('テスト');
      expect(config.headless).toBe(true);
      expect(config.debug).toBe(true);
    });

    it('should prioritize custom config over environment variables', () => {
      process.env.CLOCK_IN_TIME = '0930';
      
      const customConfig = {
        clockInTime: '1000',
      };
      
      const config = loadConfig(customConfig);
      
      expect(config.clockInTime).toBe('1000');
    });

    it('should have correct default timeout values', () => {
      const config = loadConfig();
      
      expect(config.navigationTimeout).toBe(30000);
      expect(config.elementTimeout).toBe(10000);
      expect(config.pageLoadTimeout).toBe(10000);
      expect(config.formWaitTime).toBe(3000);
      expect(config.afterSubmitWaitTime).toBe(2000);
    });
  });
});