import type { Command } from 'commander';

export abstract class AbstractCommand {
  public abstract load(program: Command): Command;
  public abstract handle(command: Command): Promise<void>;
}
