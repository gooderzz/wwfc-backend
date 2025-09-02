import { Injectable, Logger } from '@nestjs/common';
import { IBrowserService } from './browser-service.interface';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer-core';

@Injectable()
export class LocalPuppeteerService implements IBrowserService {
  private readonly logger = new Logger(LocalPuppeteerService.name);
  private browser: puppeteer.Browser | null = null;

  async launch(): Promise<Browser> {
    try {
      if (!this.browser || !this.browser.isConnected()) {
        if (this.browser) {
          await this.browser.close();
        }
        
        this.logger.log('Launching local Puppeteer browser...');
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
        this.logger.log('Local browser launched successfully');
      }
      return this.browser as unknown as Browser;
    } catch (error) {
      this.logger.error(`Failed to initialize local browser: ${error.message}`);
      throw new Error(`Local browser initialization failed: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Local browser closed');
    }
  }

  async getPage(): Promise<Page> {
    const browser = await this.launch();
    const page = await browser.newPage();
    return page as unknown as Page;
  }

  isAvailable(): boolean {
    return true; // Local Puppeteer is always available
  }
}
