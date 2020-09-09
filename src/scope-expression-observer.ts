import {
  Binding,
  connectable as $connectable,
  Expression,
  Scope,
  ObserverLocator,
} from 'aurelia-binding';
import {
  IWatcherCallback,
  IScopeExpressionObserver
} from './interfaces';

const connectable = $connectable as any;

/**
 * @internal The interface describes methods added by `connectable` & `subscriberCollection` decorators
 */
export interface ScopeExpressionObserver extends Binding {
  _version: number;
  unobserve(all?: boolean): void;
}

export class ScopeExpressionObserver<T extends object = object> implements IScopeExpressionObserver {
  /**@internal */
  private oldValue: any;

  constructor(
    public scope: Scope,
    public expression: Expression,
    public callback: IWatcherCallback<T>,
    /**@internal */
    private lookupFunctions: any,
    /**@internal used by expression.connect */
    public observerLocator: ObserverLocator,
  ) {
  }

  /**@internal */
  call() {
    let scope = this.scope;
    let expression = this.expression;
    let newValue = expression.evaluate(scope, this.lookupFunctions);
    let oldValue = this.oldValue;
    if (!Object.is(newValue, oldValue)) {
      this.oldValue = newValue;
      const obj = scope.bindingContext;
      this.callback.call(obj, newValue, oldValue, obj);
    }
    this._version++;
    expression.connect(this, scope);
    this.unobserve(false);
  }

  start() {
    this.oldValue = this.expression.evaluate(this.scope, this.lookupFunctions);
    this.expression.connect(this, this.scope);
  }

  stop() {
    this.unobserve(true);
    this.oldValue = void 0;
  }
}

// use this instead of decorator to avoid extra generated code
connectable()(ScopeExpressionObserver);
