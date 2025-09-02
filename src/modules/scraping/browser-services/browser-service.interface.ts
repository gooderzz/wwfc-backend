import { Browser, Page } from 'puppeteer-core';

export interface IBrowserService {
  /**
   * Launch a new browser instance
   */
  launch(): Promise<Browser>;

  /**
   * Close the browser instance
   */
  close(): Promise<void>;

  /**
   * Get a new page from the browser
   */
  getPage(): Promise<Page>;

  /**
   * Check if the browser service is available
   */
  isAvailable(): boolean;
}
