import { ModuleMetadata, Type } from '@nestjs/common';
import { Module } from '@nestjs/core/injector/module';
import { QueueOptions, JobsOptions } from 'bullmq';

export interface ProcessOptions {
  name?: string;
  concurrency?: number;
}

export interface IProcess {
  instance: object;
  key: string;
  moduleRef: Module;
  isRequestScoped: boolean;
  options?: ProcessOptions;
}

export type IProcessPayloadMap<A extends string, B> = {
  [key in A]: B;
};

export interface BullMQRootModuleOptions extends QueueOptions {
  url?: string;
}

export interface DynamicQueueServiceOptions extends BullMQRootModuleOptions {
  queueNamePrefix?: string;
  initialQueueNames?: string[];
}

export interface DynamicQueueServiceOptionsFactory {
  createOptions():
    | Promise<DynamicQueueServiceAsyncOptions>
    | DynamicQueueServiceAsyncOptions;
}

export interface DynamicQueueServiceAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<DynamicQueueServiceOptionsFactory>;
  useClass?: Type<DynamicQueueServiceOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<DynamicQueueServiceAsyncOptions> | DynamicQueueServiceAsyncOptions;
}

export { JobsOptions };
