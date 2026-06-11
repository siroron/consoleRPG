import chalk from 'chalk';
import boxen from 'boxen';

export class Renderer {
  static clearScreen(): void {
    process.stdout.write('\x1Bc');
  }

  static header(title: string, color = 'cyan'): void {
    const colored = chalk.hex(color === 'cyan' ? '#00bcd4' : color).bold(title);
    console.log(
      boxen(colored, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'single',
        borderColor: 'cyan',
      }),
    );
  }

  static rule(char = '─', width = 40): void {
    console.log(chalk.dim(char.repeat(width)));
  }

  static keyValue(key: string, value: string | number, indent = 0): void {
    const pad = ' '.repeat(indent);
    console.log(`${pad}${chalk.dim(key + ':')} ${chalk.white(String(value))}`);
  }
}
