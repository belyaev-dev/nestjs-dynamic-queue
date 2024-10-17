import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DynamicQueueService } from './dynamic-queue.service';
import {
  DiscoveryService,
  MetadataScanner,
} from '@nestjs/core';
import {
  DYNAMIC_QUEUE_SERVICE,
  DYNAMIC_QUEUE_SERVICE_OPTIONS,
} from './dynamic-queue.constants';
import {
  DynamicQueueServiceAsyncOptions,
  DynamicQueueServiceOptions,
  DynamicQueueServiceOptionsFactory,
} from './dynamic-queue.interface';

export const dynamicQueueFactory = {
  provide: DYNAMIC_QUEUE_SERVICE,
  useFactory: async (DynamicQueueService) => {
    return DynamicQueueService;
  },
  inject: [DynamicQueueService],
};

@Module({
  providers: [DynamicQueueService, DiscoveryService, MetadataScanner],
  exports: [DynamicQueueService, dynamicQueueFactory],
})
export class DynamicQueueModule {
  public static forRoot(options: DynamicQueueServiceOptions): DynamicModule {
    return {
      global: true,
      module: DynamicQueueModule,
      providers: [
        {
          provide: DYNAMIC_QUEUE_SERVICE_OPTIONS,
          useValue: options,
        },
        dynamicQueueFactory,
      ],
      exports: [dynamicQueueFactory],
    };
  }

  public static forRootAsync(
    options: DynamicQueueServiceAsyncOptions,
  ): DynamicModule {
    const dynamicModuleOptions: DynamicModule = {
      module: DynamicQueueModule,
      imports: options.imports || [],
      providers:
        this.createConnectAsyncProviders(options),
    };
    return dynamicModuleOptions;
  }

  private static createConnectAsyncProviders(
    options: DynamicQueueServiceAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return this.createAsyncOptionsProvider(options);
    }

    return [
      ...this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      }
    ]
  }

  private static createAsyncOptionsProvider(
    options: DynamicQueueServiceAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: DYNAMIC_QUEUE_SERVICE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }
    return [
      {
        provide: DYNAMIC_QUEUE_SERVICE_OPTIONS,
        useFactory: async (optionsFactory: DynamicQueueServiceOptionsFactory) =>
          await optionsFactory.createOptions(),
        inject: [options.useExisting || options.useClass],
      },
    ];
  }

}
