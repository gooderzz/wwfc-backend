import { Test, TestingModule } from '@nestjs/testing';
import { LocalPuppeteerService } from './local-puppeteer.service';
import { VercelPuppeteerService } from './vercel-puppeteer.service';
import { BrowserServiceFactory } from './browser-service.factory';
import { IBrowserService } from './browser-service.interface';

describe('Browser Services', () => {
  let module: TestingModule;
  let localService: LocalPuppeteerService;
  let vercelService: VercelPuppeteerService;
  let factory: BrowserServiceFactory;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        LocalPuppeteerService,
        VercelPuppeteerService,
        BrowserServiceFactory,
      ],
    }).compile();

    localService = module.get<LocalPuppeteerService>(LocalPuppeteerService);
    vercelService = module.get<VercelPuppeteerService>(VercelPuppeteerService);
    factory = module.get<BrowserServiceFactory>(BrowserServiceFactory);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('LocalPuppeteerService', () => {
    it('should be defined', () => {
      expect(localService).toBeDefined();
    });

    it('should always be available', () => {
      expect(localService.isAvailable()).toBe(true);
    });

    it('should have proper interface implementation', () => {
      expect(typeof localService.launch).toBe('function');
      expect(typeof localService.close).toBe('function');
      expect(typeof localService.getPage).toBe('function');
      expect(typeof localService.isAvailable).toBe('function');
    });
  });

  describe('VercelPuppeteerService', () => {
    it('should be defined', () => {
      expect(vercelService).toBeDefined();
    });

    it('should always be available', () => {
      expect(vercelService.isAvailable()).toBe(true);
    });

    it('should have proper interface implementation', () => {
      expect(typeof vercelService.launch).toBe('function');
      expect(typeof vercelService.close).toBe('function');
      expect(typeof vercelService.getPage).toBe('function');
      expect(typeof vercelService.isAvailable).toBe('function');
    });
  });

  describe('BrowserServiceFactory', () => {
    it('should be defined', () => {
      expect(factory).toBeDefined();
    });

    it('should create local service by default', () => {
      const originalEnv = process.env.PUPPETEER_MODE;
      delete process.env.PUPPETEER_MODE;
      
      const service = factory.create();
      expect(service).toBeInstanceOf(LocalPuppeteerService);
      
      // Restore environment
      if (originalEnv) {
        process.env.PUPPETEER_MODE = originalEnv;
      }
    });

    it('should create local service when mode is local', () => {
      const originalEnv = process.env.PUPPETEER_MODE;
      process.env.PUPPETEER_MODE = 'local';
      
      const service = factory.create();
      expect(service).toBeInstanceOf(LocalPuppeteerService);
      
      // Restore environment
      if (originalEnv) {
        process.env.PUPPETEER_MODE = originalEnv;
      } else {
        delete process.env.PUPPETEER_MODE;
      }
    });

    it('should create vercel service when mode is vercel', () => {
      const originalEnv = process.env.PUPPETEER_MODE;
      process.env.PUPPETEER_MODE = 'vercel';
      
      const service = factory.create();
      expect(service).toBeInstanceOf(VercelPuppeteerService);
      
      // Restore environment
      if (originalEnv) {
        process.env.PUPPETEER_MODE = originalEnv;
      } else {
        delete process.env.PUPPETEER_MODE;
      }
    });
  });

  describe('Service Interface Compliance', () => {
    it('should ensure all services implement IBrowserService', () => {
      const services: IBrowserService[] = [localService, vercelService];
      
      services.forEach(service => {
        expect(service).toHaveProperty('launch');
        expect(service).toHaveProperty('close');
        expect(service).toHaveProperty('getPage');
        expect(service).toHaveProperty('isAvailable');
        
        expect(typeof service.launch).toBe('function');
        expect(typeof service.close).toBe('function');
        expect(typeof service.getPage).toBe('function');
        expect(typeof service.isAvailable).toBe('function');
      });
    });
  });
});
