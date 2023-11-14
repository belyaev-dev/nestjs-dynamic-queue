import { ModuleMetadata, Type } from '@nestjs/common';
import { Module } from '@nestjs/core/injector/module';
import Bull from 'bull';

export interface ProcessOptions {
  name?: string;
  concurrency?: number;
}

export interface IProcess {
  instance: object,
  key: string,
  moduleRef: Module,
  isRequestScoped: boolean,
  options?: ProcessOptions,
}

export type IProcessPayloadMap<A extends string, B> = {
  [key in A]: B;
};

export interface BullRootModuleOptions extends Bull.QueueOptions {
  url?: string;
}

export interface DynamicQueueConnectOptions extends BullRootModuleOptions {
  queueNamePrefix?: string;
  initialQueueNames?: string[];
}

export interface DynamicQueueOptionsFactory {
  createOptions(): Promise<DynamicQueueConnectOptions> | DynamicQueueConnectOptions;
}


export interface DynamicQueueConnectAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<DynamicQueueOptionsFactory>;
  useClass?: Type<DynamicQueueOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<DynamicQueueConnectOptions> | DynamicQueueConnectOptions;
}