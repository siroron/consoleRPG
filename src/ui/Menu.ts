import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';

export interface MenuChoice<T extends string = string> {
  value: T;
  name: string;
  disabled?: string | boolean;
}

export class Menu {
  static async select<T extends string>(
    message: string,
    choices: MenuChoice<T>[],
  ): Promise<T> {
    return select<T>({
      message: chalk.cyan(message),
      choices,
    });
  }

  static async input(message: string, defaultValue?: string): Promise<string> {
    return input({
      message: chalk.cyan(message),
      default: defaultValue,
    });
  }

  static async confirm(message: string, defaultValue = true): Promise<boolean> {
    return confirm({
      message: chalk.cyan(message),
      default: defaultValue,
    });
  }
}
