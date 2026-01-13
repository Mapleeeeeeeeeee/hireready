/**
 * JD Provider Factory and exports
 * Provides a unified interface for getting the appropriate provider for a URL
 */

import { logger } from '@/lib/utils/logger';
import type { JDProvider, ProviderConfig } from './types';
import { Provider104, create104Provider } from './provider-104';
import { Provider1111, create1111Provider } from './provider-1111';
import { ManualProvider, createManualProvider, manualProvider } from './provider-manual';

// Re-export types and classes
export type { JDProvider, ProviderConfig } from './types';
export { DEFAULT_PROVIDER_CONFIG } from './types';
export { Provider104, create104Provider } from './provider-104';
export { Provider1111, create1111Provider } from './provider-1111';
export { ManualProvider, createManualProvider, manualProvider } from './provider-manual';
export { BaseJDProvider } from './base-provider';

/**
 * All available URL-based providers
 * Order matters - first matching provider will be used
 */
const URL_PROVIDERS: Array<new (config?: ProviderConfig) => JDProvider> = [
  Provider104,
  Provider1111,
];

/**
 * Provider factory - creates the appropriate provider for a given URL
 */
export class ProviderFactory {
  private providers: JDProvider[];
  private manualProvider: ManualProvider;

  constructor(config?: ProviderConfig) {
    this.providers = URL_PROVIDERS.map((Provider) => new Provider(config));
    this.manualProvider = new ManualProvider();

    logger.debug('ProviderFactory initialized', {
      module: 'jd-provider',
      action: 'init',
      providers: this.providers.map((p) => p.name),
    });
  }

  /**
   * Get the appropriate provider for a URL
   * Returns undefined if no provider can handle the URL
   */
  getProviderForUrl(url: string): JDProvider | undefined {
    for (const provider of this.providers) {
      if (provider.canHandle(url)) {
        logger.debug('Found provider for URL', {
          module: 'jd-provider',
          action: 'getProvider',
          url,
          provider: provider.name,
        });
        return provider;
      }
    }

    logger.debug('No provider found for URL', {
      module: 'jd-provider',
      action: 'getProvider',
      url,
    });
    return undefined;
  }

  /**
   * Get the manual provider
   */
  getManualProvider(): ManualProvider {
    return this.manualProvider;
  }

  /**
   * Get all supported domains
   */
  getSupportedDomains(): string[] {
    return this.providers.flatMap((p) => p.supportedDomains);
  }

  /**
   * Check if a URL is supported by any provider
   */
  isUrlSupported(url: string): boolean {
    return this.providers.some((p) => p.canHandle(url));
  }
}

/**
 * Default factory instance with default configuration
 */
let defaultFactory: ProviderFactory | null = null;

/**
 * Get or create the default factory instance
 */
export function getProviderFactory(config?: ProviderConfig): ProviderFactory {
  if (!defaultFactory || config) {
    defaultFactory = new ProviderFactory(config);
  }
  return defaultFactory;
}

/**
 * Get the appropriate provider for a URL using the default factory
 */
export function getProviderForUrl(url: string): JDProvider | undefined {
  return getProviderFactory().getProviderForUrl(url);
}

/**
 * Check if a URL is supported by any provider
 */
export function isUrlSupported(url: string): boolean {
  return getProviderFactory().isUrlSupported(url);
}

/**
 * Get all supported domains
 */
export function getSupportedDomains(): string[] {
  return getProviderFactory().getSupportedDomains();
}
