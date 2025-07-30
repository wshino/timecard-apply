import { Command } from 'commander';
import { Config } from './config';
import * as fs from 'fs';
import * as path from 'path';

export interface CliOptions {
  config?: string;
  dryRun?: boolean;
  headless?: boolean;
  debug?: boolean;
  clockIn?: string;
  clockOut?: string;
  reason?: string;
  maxRows?: number;
  dateFrom?: string;
  dateTo?: string;
}

export function parseCliArguments(): CliOptions {
  const program = new Command();
  
  program
    .name('timecard-apply')
    .description('Automate King of Time timecard applications')
    .version('1.0.0')
    .option('-c, --config <path>', 'path to config file', 'config.json')
    .option('-d, --dry-run', 'run in dry mode without submitting')
    .option('--headless', 'run browser in headless mode')
    .option('--debug', 'enable debug logging')
    .option('--clock-in <time>', 'clock in time (HHMM format)', '1000')
    .option('--clock-out <time>', 'clock out time (HHMM format)', '1900')
    .option('--reason <text>', 'application reason', 'x')
    .option('--max-rows <number>', 'maximum number of rows to process', parseInt)
    .option('--date-from <date>', 'process from date (YYYY-MM-DD)')
    .option('--date-to <date>', 'process to date (YYYY-MM-DD)')
    .parse();
  
  return program.opts();
}

export function mergeConfigWithCliOptions(
  baseConfig: Config,
  cliOptions: CliOptions
): Config {
  const config = { ...baseConfig };
  
  // Override with CLI options if provided
  if (cliOptions.dryRun !== undefined) {
    config.dryRun = cliOptions.dryRun;
  }
  if (cliOptions.headless !== undefined) {
    config.headless = cliOptions.headless;
  }
  if (cliOptions.debug !== undefined) {
    config.debug = cliOptions.debug;
  }
  if (cliOptions.clockIn) {
    config.clockInTime = cliOptions.clockIn;
  }
  if (cliOptions.clockOut) {
    config.clockOutTime = cliOptions.clockOut;
  }
  if (cliOptions.reason) {
    config.applicationReason = cliOptions.reason;
  }
  
  return config;
}

export function loadConfigFromFile(configPath: string): Partial<Config> | null {
  const fullPath = path.resolve(configPath);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  
  try {
    const configData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    return configData;
  } catch (error) {
    console.error(`Error reading config file ${fullPath}:`, error);
    return null;
  }
}