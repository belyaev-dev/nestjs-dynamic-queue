import {
  Reflector,
  DiscoveryService,
  MetadataScanner,
  createContextId,
  ModuleRef,
} from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Inject, Injectable, Type } from '@nestjs/common';
import { Queue, Worker, Job, QueueOptions, JobsOptions } from 'bullmq';
import {
  DynamicQueueConnectOptions,
  IProcess,
  IProcessPayloadMap,
  ProcessOptions,
} from './dynamic-queue.interface';
import {
  DYNAMIC_QUEUE_CONNECT_OPTIONS,
  BULLMQ_MODULE_QUEUE,
  BULLMQ_MODULE_QUEUE_PROCESS,
} from './dynamic-queue.constants';
import { Module } from '@nestjs/core/injector/module';
import { Injector } from '@nestjs/core/injector/injector';

@Injectable()
export class DynamicQueueService {
  private readonly injector = new Injector();
  private accountsQueue: Record<
    string,
    {
      queue: Queue;
      worker: Worker;
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
    return this.reflector.get(BULLMQ_MODULE_QUEUE_PROCESS, target);
  }

  private isProcessor(target: Type<any> | Function): boolean {
    if (!target) {
      return false;
    }
    return !!this.reflector.get(BULLMQ_MODULE_QUEUE_PROCESS, target);
  }

  private isQueue(target: Type<any> | Function): boolean {
    if (!target) {
      return false;
    }
    return !!this.reflector.get(BULLMQ_MODULE_QUEUE, target);
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
    options?: JobsOptions,
  ) {
    const queue = await this.getAccountQueue(accountId);
    return queue.add(processName, payload, options);
  }

  async getAccountQueue(queueId: string) {
    if (!!this.accountsQueue[queueId]?.queue)
      return this.accountsQueue[queueId].queue;

    const config: QueueOptions = {
      ...this.dynamicQueueConnectOptions,
      prefix: this.dynamicQueueConnectOptions.queueNamePrefix,
    };

    const queue = new Queue(queueId, config);
    const worker = new Worker(queueId, async (job: Job) => {
      const process = this.processes.find(p => p.options?.name === job.name);
      if (process) {
        const { instance, key, moduleRef, isRequestScoped } = process;
        const contextId = createContextId();
        const contextInstance = await this.injector.loadPerContext(
          instance,
          moduleRef,
          moduleRef.providers,
          contextId,
        );

        if (isRequestScoped) {
          if (this.moduleRef.registerRequestByContextId) {
            this.moduleRef.registerRequestByContextId(job, contextId);
          }
        }

        return contextInstance[key].call(contextInstance, job);
      }
    }, config);

    this.accountsQueue[queueId] = {
      queue,
      worker,
    };

    return queue;
  }
}
