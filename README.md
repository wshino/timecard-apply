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
  "debug": false
}
```

## How to Use

Run the program with:
```bash
pnpm timecard-apply
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
