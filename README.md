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

## Common Issues

If you see an error message:
- Check if your `.env` file is set up correctly
- Make sure your KingOfTime ID and password are correct
- Verify that you have a stable internet connection

## Development

This program was developed using:
- Playwright for browser automation
- Cursor IDE with MCP (Multi-model Code Processing) server for development assistance
- TypeScript for type-safe code

## Support

If you have any questions or problems, please create an issue in this repository.# timecard-apply
