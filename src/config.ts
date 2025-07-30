export interface Config {
  // Time settings
  clockInTime: string;    // Format: HHMM (e.g., "1000" for 10:00)
  clockOutTime: string;   // Format: HHMM (e.g., "1900" for 19:00)
  applicationReason: string;
  
  // Browser settings
  headless: boolean;
  
  // Timeout settings (in milliseconds)
  navigationTimeout: number;
  elementTimeout: number;
  pageLoadTimeout: number;
  formWaitTime: number;
  afterSubmitWaitTime: number;
  
  // Debug settings
  debug: boolean;
}

export const defaultConfig: Config = {
  // Time settings
  clockInTime: '1000',
  clockOutTime: '1900',
  applicationReason: 'x',
  
  // Browser settings
  headless: false,
  
  // Timeout settings
  navigationTimeout: 30000,
  elementTimeout: 10000,
  pageLoadTimeout: 10000,
  formWaitTime: 3000,
  afterSubmitWaitTime: 2000,
  
  // Debug settings
  debug: false,
};

export function loadConfig(customConfig?: Partial<Config>): Config {
  const config = { ...defaultConfig };
  
  // Override with environment variables if present
  if (process.env.CLOCK_IN_TIME) {
    config.clockInTime = process.env.CLOCK_IN_TIME;
  }
  if (process.env.CLOCK_OUT_TIME) {
    config.clockOutTime = process.env.CLOCK_OUT_TIME;
  }
  if (process.env.APPLICATION_REASON) {
    config.applicationReason = process.env.APPLICATION_REASON;
  }
  if (process.env.HEADLESS === 'true') {
    config.headless = true;
  }
  if (process.env.DEBUG === 'true') {
    config.debug = true;
  }
  
  // Override with custom config if provided
  if (customConfig) {
    Object.assign(config, customConfig);
  }
  
  return config;
}