import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DynamicQueueService } from './dynamic-queue.service';
import { DiscoveryModule, DiscoveryService, MetadataScanner } from '@nestjs/core';
import { DYNAMIC_QUEUE_CONNECT_OPTIONS } from './dynamic-queue.constants';
import { DynamicQueueConnectAsyncOptions, DynamicQueueConnectOptions, DynamicQueueOptionsFactory } from './dynamic-queue.interface';


@Module({
  imports: [DiscoveryModule]
})
export class DynamicQueueModule {
  public static forRoot(options: DynamicQueueConnectOptions): DynamicModule {
    return {
      module: DynamicQueueModule,
      providers: [
        {
          provide: DYNAMIC_QUEUE_CONNECT_OPTIONS,
          useValue: options,
        },
        DynamicQueueService,
        DiscoveryService,
        MetadataScanner,
      ],
      exports: [DynamicQueueService],
      global: true,
    };
  }

  public static forRootAsync(
    connectOptions: DynamicQueueConnectAsyncOptions,
  ): DynamicModule {
    const dynamicModuleOptions: DynamicModule = {
        module: DynamicQueueModule,
        imports: connectOptions.imports || [],
        providers: [this.createConnectAsyncProviders(connectOptions), DynamicQueueService],
        exports: [DynamicQueueService],
        global: true
    }
    return dynamicModuleOptions;
  }

  private static createConnectAsyncProviders(
    options: DynamicQueueConnectAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: DYNAMIC_QUEUE_CONNECT_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: DYNAMIC_QUEUE_CONNECT_OPTIONS,
      useFactory: async (optionsFactory: DynamicQueueOptionsFactory) =>
        await optionsFactory.createOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
