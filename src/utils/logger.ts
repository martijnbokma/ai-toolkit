import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export const log = {
  info: (msg: string) => console.log(chalk.cyan('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✗'), msg),
  dim: (msg: string) => console.log(chalk.gray('  ' + msg)),
  synced: (from: string, to: string) =>
    console.log(chalk.green('  ✓'), `${chalk.gray(from)} → ${to}`),
  removed: (path: string) =>
    console.log(chalk.yellow('  🗑'), `Removed: ${path}`),
  dryRun: (action: string, target: string) =>
    console.log(chalk.magenta('  ⊘'), chalk.magenta(`[dry-run] ${action}:`), target),
  header: (msg: string) =>
    console.log('\n' + chalk.bold.underline(msg)),
};

export function createSpinner(text: string): Ora {
  return ora({ text, color: 'cyan' });
}
