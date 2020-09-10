import { Container } from 'aurelia-dependency-injection';
import { Controller, HtmlBehaviorResource, ViewFactory, ViewResources } from 'aurelia-templating';
import { Scope } from 'aurelia-binding';

export interface ICallable {
  call(): any;
}

export type IPropertyAccessFn<T extends object, R = unknown> = (vm: T) => R;
export type IWatcherCallback<T extends object, TValue = unknown> = (this: T, newValue: TValue, oldValue: TValue, vm: T) => unknown;

export interface Constructable<T extends object = object> {
  new (...args: any[]): T;
}

export interface IWatchConfiguration<T extends object = object> {
  expression: PropertyKey | ((vm: object) => any);
  callback: PropertyKey | IWatcherCallback<T>;
}

export interface INormalizedWatchConfiguration<T extends object = object> {
  expression: string;
  callback: PropertyKey | IWatcherCallback<T>;
}

export interface IScopeExpressionObserver<T extends object = object> {
  scope: Scope;
  callback: IWatcherCallback<T>;
  start(): void;
  stop(): void;
}

/**
 * @internal
 */
declare module 'aurelia-templating' {
  interface Controller {
    container: Container;
    $obs: IScopeExpressionObserver[];
    shouldWatch: boolean;
  }
  
  interface HtmlBehaviorResource {
    _$w: INormalizedWatchConfiguration<object>[];
    $watch: IWatchConfiguration[];
    hasWatches: boolean;
    viewFactory: ViewFactory;
  }

  interface ViewFactory {
    viewResources: ViewResources;
  }

  interface ViewResources {
    lookupFunctions: any;
  }
}
