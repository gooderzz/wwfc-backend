import { Injectable } from '@nestjs/common';
import { IBrowserService } from './browser-service.interface';
import { LocalPuppeteerService } from './local-puppeteer.service';
import { VercelPuppeteerService } from './vercel-puppeteer.service';

@Injectable()
export class BrowserServiceFactory {
  constructor(
    private readonly localService: LocalPuppeteerService,
    private readonly vercelService: VercelPuppeteerService
  ) {}

  create(): IBrowserService {
    const mode = process.env.PUPPETEER_MODE || 'local';
    
    if (mode === 'vercel') {
      return this.vercelService;
    } else {
      return this.localService;
    }
  }
}
