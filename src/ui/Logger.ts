import chalk from 'chalk';
import { CONFIG } from '../constants/config.js';

export class Logger {
  private buffer: string[] = [];
  private readonly maxSize: number;

  constructor(maxSize = CONFIG.LOG_BUFFER_SIZE) {
    this.maxSize = maxSize;
  }

  log(message: string): void {
    this.push(message);
  }

  warn(message: string): void {
    this.push(chalk.yellow(message));
  }

  error(message: string): void {
    this.push(chalk.red(message));
  }

  getLast(n?: number): readonly string[] {
    if (n === undefined) return this.buffer;
    return this.buffer.slice(-n);
  }

  render(visibleLines = 5): void {
    const lines = this.getLast(visibleLines);
    for (const line of lines) {
      console.log(line);
    }
  }

  clear(): void {
    this.buffer = [];
  }

  private push(line: string): void {
    this.buffer.push(line);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
}
