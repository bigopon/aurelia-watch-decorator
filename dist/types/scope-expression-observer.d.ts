import { Expression, Scope, ObserverLocator } from 'aurelia-binding';
import { IWatcherCallback, IScopeExpressionObserver } from './interfaces';
export declare class ScopeExpressionObserver<T extends object = object> implements IScopeExpressionObserver {
    scope: Scope;
    expression: Expression;
    callback: IWatcherCallback<T>;
    constructor(scope: Scope, expression: Expression, callback: IWatcherCallback<T>, 
    /**@internal */
    lookupFunctions: any, 
    /**@internal used by expression.connect */
    observerLocator: ObserverLocator);
    begin(): void;
    end(): void;
}
