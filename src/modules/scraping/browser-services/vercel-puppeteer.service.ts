import { Injectable, Logger } from '@nestjs/common';
import { IBrowserService } from './browser-service.interface';
import { Browser, Page } from 'puppeteer-core';

@Injectable()
export class VercelPuppeteerService implements IBrowserService {
  private readonly logger = new Logger(VercelPuppeteerService.name);
  private browser: Browser | null = null;

  async launch(): Promise<Browser> {
    try {
      if (!this.browser || !this.browser.isConnected()) {
        if (this.browser) {
          await this.browser.close();
        }
        
        this.logger.log('Launching Vercel Puppeteer browser...');
        
        // Dynamic imports for Vercel compatibility
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteer = await import('puppeteer-core');
        
        this.browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
        
        this.logger.log('Vercel browser launched successfully');
      }
      return this.browser;
    } catch (error) {
      this.logger.error(`Failed to initialize Vercel browser: ${error.message}`);
      throw new Error(`Vercel browser initialization failed: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Vercel browser closed');
    }
  }

  async getPage(): Promise<Page> {
    const browser = await this.launch();
    const page = await browser.newPage();
    return page;
  }

  isAvailable(): boolean {
    return true; // Vercel Puppeteer is available when deployed
  }
}
