import { Scope } from 'aurelia-binding';
export interface ICallable {
    call(): any;
}
export declare type IPropertyAccessFn<T extends object, R = unknown> = (vm: T) => R;
export declare type IWatcherCallback<T extends object, TValue = unknown> = (this: T, newValue: TValue, oldValue: TValue, vm: T) => unknown;
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
