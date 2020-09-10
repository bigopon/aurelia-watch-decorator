import { metadata } from "aurelia-metadata";
import { HtmlBehaviorResource } from "aurelia-templating";
import { Constructable, IPropertyAccessFn, IWatcherCallback } from "./interfaces";
import { patchController } from "./patch-controller";

type AnyMethod<R = unknown> = (...args: unknown[]) => R;
type WatchClassDecorator<T extends object> = <K>(target: K extends Constructable<T> ? Constructable<T> : Function) => void;
type WatchMethodDecorator<T> = <R, K extends AnyMethod<R> = AnyMethod<R>>(target: T, key: string | symbol, descriptor: TypedPropertyDescriptor<K>) => TypedPropertyDescriptor<K>;

export function watch<T extends object = object, D = unknown>(
  expressionOrPropertyAccessFn: string | IPropertyAccessFn<T, D>,
  changeHandlerOrCallback: string | IWatcherCallback<T, D>,
): WatchClassDecorator<T>;

// MethodDecorator = <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
export function watch<T extends object = object, D = unknown>(
  expressionOrPropertyAccessFn: string | IPropertyAccessFn<T, D>,
  changeHandlerOrCallback?: string | IWatcherCallback<T, D>,
): WatchMethodDecorator<T>;

export function watch<T extends object = object>(
  expressionOrPropertyAccessFn: string | IPropertyAccessFn<T>,
  changeHandlerOrCallback?: string | IWatcherCallback<T>,
): any {
  patchController();

  return function decorator(
    target: Constructable<T> | Constructable<T>['prototype'],
    key?: PropertyKey,
    descriptor?: PropertyDescriptor,
  ) {
    // class decorator?
    const isClassDecorator = key == null;
    const ctor = isClassDecorator ? target : target.constructor;

    // basic validation
    if (typeof changeHandlerOrCallback === 'string' && !(changeHandlerOrCallback in ctor.prototype)) {
      throw new Error(`Invalid change handler config. Method not found in class ${ctor.name}`);
    }

    if (!isClassDecorator && typeof descriptor.value !== 'function') {
      throw new Error(`decorated target ${String(key)} is not a class method.`);
    }

    const behaviorMetadata = metadata.getOrCreateOwn(
      metadata.resource,
      HtmlBehaviorResource,
      ctor as Constructable<T>,
    ) as HtmlBehaviorResource;

    const watchExpressions = behaviorMetadata.$watch = (behaviorMetadata.$watch || [])
    watchExpressions.push({
      expression: expressionOrPropertyAccessFn,
      callback: isClassDecorator ? changeHandlerOrCallback : descriptor.value,
    });
    behaviorMetadata.hasWatches = true;

    if (isClassDecorator) {
      return;
    }

    return descriptor;
  }
}
