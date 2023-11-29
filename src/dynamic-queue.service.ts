import {
  Reflector,
  DiscoveryService,
  MetadataScanner,
  createContextId,
  ModuleRef,
} from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Inject, Injectable, Type } from '@nestjs/common';
import * as Bull from 'bull';
import {
  DynamicQueueConnectOptions,
  IProcess,
  IProcessPayloadMap,
  ProcessOptions,
} from './dynamic-queue.interface';
import {
  DYNAMIC_QUEUE_CONNECT_OPTIONS,
  BULL_MODULE_QUEUE,
  BULL_MODULE_QUEUE_PROCESS,
} from './dynamic-queue.constants';
import { Module } from '@nestjs/core/injector/module';
import { Injector } from '@nestjs/core/injector/injector';

@Injectable()
export class DynamicQueueService {
  private readonly injector = new Injector();
  private accountsQueue: Record<
    string,
    {
      bull: Bull.Queue;
    }
  >;
  private processes: IProcess[];

  constructor(
    @Inject(DYNAMIC_QUEUE_CONNECT_OPTIONS)
    private readonly dynamicQueueConnectOptions: DynamicQueueConnectOptions,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {
    this.accountsQueue = {};
    this.processes = [];

    this.discoveryService.getProviders().forEach((wrapper: InstanceWrapper) => {
      if (
        !this.isQueue(
          !wrapper.metatype || wrapper.inject
            ? wrapper.instance?.constructor
            : wrapper.metatype,
        )
      )
        return;

      const { instance } = wrapper;
      const isRequestScoped = !wrapper.isDependencyTreeStatic();

      const allMethods = this.metadataScanner.getAllMethodNames(instance);
      const processes = allMethods.reduce((acc, key) => {
        if (!this.isProcessor(instance[key])) return acc;
        const processMetadata = this.getProcessMetadata(instance[key]);
        acc.push({
          instance,
          key,
          moduleRef: wrapper.host,
          isRequestScoped,
          options: processMetadata,
        });
        return acc;
      }, []);
      this.processes.push(...processes);
    });
  }

  private getProcessMetadata(
    target: Type<any> | Function,
  ): ProcessOptions | undefined {
    return this.reflector.get(BULL_MODULE_QUEUE_PROCESS, target);
  }

  private isProcessor(target: Type<any> | Function): boolean {
    if (!target) {
      return false;
    }
    return !!this.reflector.get(BULL_MODULE_QUEUE_PROCESS, target);
  }

  private isQueue(target: Type<any> | Function): boolean {
    if (!target) {
      return false;
    }
    return !!this.reflector.get(BULL_MODULE_QUEUE, target);
  }

  async onModuleInit() {
    this.dynamicQueueConnectOptions.initialQueueNames?.forEach(
      async (queueName) => {
        await this.getAccountQueue(queueName);
      },
    );
  }

  async addTask<T extends string, P>(
    accountId: string,
    processName: T,
    payload: IProcessPayloadMap<T, P>[T],
    options?: Bull.JobOptions,
  ) {
    const queue = await this.getAccountQueue(accountId);
    return queue.add(processName, payload, options);
  }

  async getAccountQueue(queueId: string) {
    if (!!this.accountsQueue[queueId]?.bull)
      return this.accountsQueue[queueId].bull;

    const config = {
      ...this.dynamicQueueConnectOptions,
      queueNamePrefix: undefined,
    };

    const queue = new Bull(
      `${this.dynamicQueueConnectOptions.queueNamePrefix || ''}${queueId}`,
      config,
    );

    this.accountsQueue[queueId] = {
      bull: queue,
    };

    for (const { instance, key, moduleRef, isRequestScoped, options } of this
      .processes) {
      await this.handleProcessor(
        instance,
        key,
        queue,
        moduleRef,
        isRequestScoped,
        options,
      );
    }

    return queue;
  }

  private async handleProcessor(
    instance: object,
    key: string,
    queue: Bull.Queue,
    moduleRef: Module,
    isRequestScoped: boolean,
    options?: ProcessOptions,
  ) {
    const concurrency = options?.concurrency || 0;

    let args: unknown[] = [options?.name, concurrency];

    const contextId = createContextId();
    const contextInstance = await this.injector.loadPerContext(
      instance,
      moduleRef,
      moduleRef.providers,
      contextId,
    );

    if (isRequestScoped) {
      const callback: Bull.ProcessCallbackFunction<unknown> = async (
        ...args: unknown[]
      ) => {
        if (this.moduleRef.registerRequestByContextId) {
          // Additional condition to prevent breaking changes in
          // applications that use @nestjs/bull older than v7.4.0.
          const jobRef = args[0];
          this.moduleRef.registerRequestByContextId(jobRef, contextId);
        }
        return contextInstance[key].call(contextInstance, ...args);
      };
      args.push(callback);
    } else {
      args.push(
        instance[key].bind(
          contextInstance,
        ) as Bull.ProcessCallbackFunction<unknown>,
      );
    }
    args = args.filter((item) => item !== undefined);
    queue.process.call(queue, ...args);
  }
}
