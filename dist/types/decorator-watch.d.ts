import { Constructable, IPropertyAccessFn, IWatcherCallback } from "./interfaces";
declare type AnyMethod<R = unknown> = (...args: unknown[]) => R;
declare type WatchClassDecorator<T extends object> = <K>(target: K extends Constructable<T> ? Constructable<T> : Function) => void;
declare type WatchMethodDecorator<T> = <R, K extends AnyMethod<R> = AnyMethod<R>>(target: T, key: string | symbol, descriptor: TypedPropertyDescriptor<K>) => TypedPropertyDescriptor<K>;
export declare function watch<T extends object = object, D = unknown>(expressionOrPropertyAccessFn: string | IPropertyAccessFn<T, D>, changeHandlerOrCallback: string | IWatcherCallback<T, D>): WatchClassDecorator<T>;
export declare function watch<T extends object = object, D = unknown>(expressionOrPropertyAccessFn: string | IPropertyAccessFn<T, D>, changeHandlerOrCallback?: string | IWatcherCallback<T, D>): WatchMethodDecorator<T>;
export {};
