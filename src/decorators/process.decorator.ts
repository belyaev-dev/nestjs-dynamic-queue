import { SetMetadata } from '@nestjs/common';
import { ProcessOptions } from '../dynamic-queue.interface';
import { BULLMQ_MODULE_QUEUE_PROCESS } from '../dynamic-queue.constants';
import { isString } from '@nestjs/common/utils/shared.utils';

export function Process(): MethodDecorator;
export function Process(name: string): MethodDecorator;
export function Process(options: ProcessOptions): MethodDecorator;
export function Process(
  nameOrOptions?: string | ProcessOptions,
): MethodDecorator {
  const options = isString(nameOrOptions)
    ? { name: nameOrOptions }
    : nameOrOptions;
  return SetMetadata(BULLMQ_MODULE_QUEUE_PROCESS, options || {});
}
