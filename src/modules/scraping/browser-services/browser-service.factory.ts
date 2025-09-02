import { Injectable } from '@nestjs/common';
import { IBrowserService } from './browser-service.interface';
import { LocalPuppeteerService } from './local-puppeteer.service';
import { VercelPuppeteerService } from './vercel-puppeteer.service';

@Injectable()
export class BrowserServiceFactory {
  static create(): IBrowserService {
    const mode = process.env.PUPPETEER_MODE || 'local';
    
    if (mode === 'vercel') {
      return new VercelPuppeteerService();
    } else {
      return new LocalPuppeteerService();
    }
  }
}
