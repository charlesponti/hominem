import fs from 'node:fs';
import path from 'node:path';

interface GenerateObjectLog {
  timestamp: string;
  prompt?: string;
  response?: unknown;
  error?: string;
}

export function writeToLogFile(data: GenerateObjectLog) {
  const logDir = path.resolve(process.cwd(), 'logs');
  const logFile = path.resolve(logDir, 'generate-responses.json');

  // Ensure logs directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Read existing logs or create empty array
  let logs: GenerateObjectLog[] = [];
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      logs = JSON.parse(content);
    } catch (error) {
      console.error('Error reading log file:', error);
    }
  }

  // Add new log entry
  logs.push(data);

  // Write back to file
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
}
