<h1 align="center"></h1>

<div align="center">
  <a href="http://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo_text.svg" width="150" alt="Nest Logo" />
  </a>
</div>

<h3 align="center">NestJS Dynamic Queue Module</h3>
<a href="https://www.npmjs.com/package/nestjs-dynamic-queue"><img src="https://img.shields.io/npm/v/nestjs-dynamic-queue.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/nestjs-dynamic-queue"><img src="https://img.shields.io/npm/l/nestjs-dynamic-queue.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/package/nestjs-dynamic-queue"><img src="https://img.shields.io/npm/dm/nestjs-dynamic-queue.svg" alt="NPM Downloads" /></a>

<div align="center">
  <a href="https://nestjs.com" target="_blank">
    <img src="https://img.shields.io/badge/built%20with-NestJs-red.svg" alt="Built with NestJS">
  </a>
</div>

### Introduction

The nestjs-dynamic-queue package is a NestJS module that allows you to create
queues at runtime and send messages to them. It provides a wrapper around the
BullMQ package, which is a powerful Redis-based queue library. With
nestjs-dynamic-queue, you can easily integrate queue functionality into your
NestJS application and leverage the features provided by BullMQ, such as job
scheduling, retries, and prioritization.

> **Note:** This package has been updated to use BullMQ instead of Bull. If
> you're upgrading from a previous version, please check the
> [migration guide](#migration-guide).

### Installation

```bash
yarn add nestjs-dynamic-queue
```

or

```bash
npm i nestjs-dynamic-queue
```

### Usage

#### Importing module Async

```typescript
import {
  DynamicQueueConnectOptions,
  DynamicQueueModule,
} from "nestjs-dynamic-queue";

@Module({
  imports: [
    DynamicQueueModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService,
      ): Promise<DynamicQueueConnectOptions> => ({
        queueNamePrefix: "prefix",
        connection: {
          host: configService.get("REDIS_HOST"),
          port: configService.get("REDIS_PORT"),
          password: configService.get("REDIS_PASSWORD"),
        },
        defaultJobOptions: {
          attempts: 4,
        },
        initialQueueNames: ["someInitialQueue"],
      }),
    }),
  ],
  providers: [],
  exports: [],
})
export class AppModule {}
```

#### Add queue and create task

```typescript
import { DynamicQueueService } from "nestjs-dynamic-queue";

@Injectable()
export class YourService {
  constructor(private dynamicQueueService: DynamicQueueService) {}

  async method() {
    await this.dynamicQueueService.addTask("queue", "type task", payload);
    return;
  }
}
```

#### Create processor and processes

```typescript
import { Process, Processor } from "nestjs-dynamic-queue";
import { Job } from "bullmq";

@Processor()
export class WebhookProcessor {
  constructor(private readonly yourService: YourService) {}

  @Process({ name: "type task", concurrency: 1 })
  async clean(job: Job<IAddTaskPayload>) {
    await this.yourService.processTask(job.data);
  }
}
```

### Migration Guide

If you're upgrading from a version that used Bull to this version that uses
BullMQ, here are the main changes you need to be aware of:

1. The `redis` option in the connection configuration has been renamed to
   `connection`.
2. Job types now come from `bullmq` instead of `bull`.
3. Some method names and options might have changed. Please refer to the
   [BullMQ documentation](https://docs.bullmq.io/) for detailed API changes.

## Contributing

Contributions welcome! See [Contributing](CONTRIBUTING.md).

## Author

**Yaroslav Tolstoy [Site](https://github.com/yatolstoy)**

## License

Licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
