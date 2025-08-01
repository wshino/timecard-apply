# Timecard Apply

This program helps you automatically submit time clock applications for error entries in KingOfTime.

## Setup

1. Install dependencies
```bash
pnpm install
```

2. Create a `.env` file in the root directory and add your KingOfTime login information:
```
KINGOFTIME_ID=your_id_here
KINGOFTIME_PASSWORD=your_password_here
```

3. (Optional) Create a `config.json` file to customize settings:
```json
{
  "clockInTime": "1000",    // 10:00
  "clockOutTime": "1900",   // 19:00
  "applicationReason": "x",
  "headless": false,
  "debug": false,
  "dryRun": false         // Set to true to preview without submitting
}
```

## How to Use

Run the program with:
```bash
pnpm timecard-apply
```

For dry run mode (preview without submitting):
```bash
DRY_RUN=true pnpm timecard-apply
```

## Command Line Options

```bash
pnpm timecard-apply [options]
```

Options:
- `-c, --config <path>` - Path to config file (default: config.json)
- `-d, --dry-run` - Run in dry mode without submitting
- `--headless` - Run browser in headless mode
- `--debug` - Enable debug logging
- `--clock-in <time>` - Clock in time in HHMM format (default: 1000)
- `--clock-out <time>` - Clock out time in HHMM format (default: 1900)
- `--reason <text>` - Application reason (default: x)
- `--max-rows <number>` - Maximum number of rows to process
- `--date-from <date>` - Process from date (YYYY-MM-DD) *Not yet implemented*
- `--date-to <date>` - Process to date (YYYY-MM-DD) *Not yet implemented*

Examples:
```bash
# Process only 5 rows in dry run mode
pnpm timecard-apply --dry-run --max-rows 5

# Use custom times
pnpm timecard-apply --clock-in 0930 --clock-out 1830

# Debug mode with custom config
pnpm timecard-apply --debug --config my-config.json
```

What the program does:
- Logs into your KingOfTime account
- Finds rows with time clock errors
- For each error:
  - Selects the time clock application option
  - Enters clock-in time (10:00)
  - Enters clock-out time (19:00)
  - Submits the application
- Continues until all errors are processed
- Closes automatically when finished

Note: The program will open a browser window so you can see what's happening. Please don't close the window while it's running.

## Requirements
- Node.js
- pnpm (`npm install -g pnpm`)
- A KingOfTime account with login access

## Logging

The program creates detailed logs in the `logs/` directory:
- `application.log` - General application logs
- `error.log` - Error logs only
- `processing-history-YYYY-MM-DD.log` - Daily processing history
- `sessions.log` - Session start/end statistics

## Common Issues

If you see an error message:
- Check if your `.env` file is set up correctly
- Make sure your KingOfTime ID and password are correct
- Verify that you have a stable internet connection
- Check the logs in the `logs/` directory for detailed error information

## Testing

Run tests with the following commands:
```bash
# Run all unit tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run E2E tests (requires mock server)
pnpm test:e2e
```

## Development

This program was developed using:
- Playwright for browser automation
- Cursor IDE with MCP (Multi-model Code Processing) server for development assistance
- TypeScript for type-safe code
- Vitest for unit testing
- Winston for logging

## Support

If you have any questions or problems, please create an issue in this repository.# timecard-apply
