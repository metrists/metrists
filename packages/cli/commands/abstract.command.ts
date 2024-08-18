import type { Logger } from '../lib/utils/logger.util';
import type { Command } from 'commander';

export interface Services {
  logger: Logger;
}

export abstract class AbstractCommand {
  protected services: Services;
  protected logger: Services['logger'];
  public abstract load(program: Command): Command;
  public abstract handle(command: Command): Promise<void>;

  public setServices(services: Services): void {
    this.services = services;
    this.logger = services.logger;
  }
}
