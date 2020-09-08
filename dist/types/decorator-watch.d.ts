import { IPropertyAccessFn, IWatcherCallback } from "./interfaces";
export declare function watch<T extends object = object>(expressionOrPropertyAccessFn: string | IPropertyAccessFn<T>, changeHandlerOrCallback?: string | IWatcherCallback<T>): any;
