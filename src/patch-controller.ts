import { Controller, ViewResources, HtmlBehaviorResource } from 'aurelia-templating';
import { IWatchConfiguration, Constructable, INormalizedWatchConfiguration, IScopeExpressionObserver } from './interfaces';
import { Parser, Scope, createOverrideContext, ObserverLocator } from 'aurelia-binding';
import { ScopeExpressionObserver } from './scope-expression-observer';

let patched = false;
export function patchController() {
  if (patched) {
    return;
  }
  patched = true;
  ((controllerPrototype) => {
    controllerPrototype.bind = ((bindFn) => function bind(this: Controller) {
      if (!this.$obs) {
        this.$obs = createObservers(this);
      }
      this.$obs.forEach(beginObserver);
      return bindFn.apply(this, arguments);
    })(controllerPrototype.bind);
  
    controllerPrototype.unbind = ((unbindFn) => function unbind(this: Controller) {
      // avoid giving the impression that it's safe to rely on watchers during unbind
      // when everything has gotten disposed
      // change propagation won't happen as expected, it happens on next tick after unbind
      this.$obs.forEach(endObserver);
      const originalReturn = unbindFn.apply(this, arguments);
      return originalReturn;
    })(controllerPrototype.unbind);
  })(Controller.prototype);
}

const noConfiguration: IWatchConfiguration[] = [];
function createObservers(controller: Controller): IScopeExpressionObserver[] {
  const container       = controller.container;
  const behavior        = controller.behavior;
  const viewModel       = controller.viewModel;
  const parser          = container.get(Parser);
  const lookupFunctions = container.get(ViewResources).lookupFunctions;
  const observerLocator = container.get(ObserverLocator);
  const Ctor            = viewModel.constructor as Constructable & {
    _$w: INormalizedWatchConfiguration[];
    $watch?: IWatchConfiguration[]
  };
  const scope: Scope    = {
    bindingContext: viewModel,
    overrideContext: createOverrideContext(viewModel)
  };

  if (!behavior._$w) {
    behavior._$w = normalizeWatchConfiguration(behavior.$watch || noConfiguration);
  }
  if (!Ctor._$w) {
    Ctor._$w = normalizeWatchConfiguration(Ctor.$watch || noConfiguration)
  }

  return behavior
    ._$w
    .concat(Ctor._$w)
    .map(watchConfiguration => {
      const watchExpression = watchConfiguration.expression;
      const callback = watchConfiguration.callback;
      const callbackType = typeof callback;

      if (!watchExpression || !callback) {
        throw new Error(`Invalid watch config. Expression: ${watchExpression}. Callback: ${callbackType}`);
      }
      const expression = parser.parse(watchExpression);
      const expressionObserver = new ScopeExpressionObserver(
        scope,
        expression,
        callbackType === 'function'
          ? callback
          : viewModel.constructor[callback as string],
        lookupFunctions,
        observerLocator,
      );

      return expressionObserver;
    });
}

function beginObserver(obs: IScopeExpressionObserver) {
  obs.begin();
}

function endObserver(obs: IScopeExpressionObserver) {
  obs.end();
}

function normalizeWatchConfiguration(configurations: IWatchConfiguration[]): INormalizedWatchConfiguration[] {
  return configurations
    .map(watchConfiguration => {
      const expression = watchConfiguration.expression;
      return {
        expression: typeof expression === 'function'
          ? getAccessorExpression(expression.toString())
          : String(expression),
        callback: watchConfiguration.callback,
      };
    });
}

const parseResultsCache: Record<string, string> = {};
function getAccessorExpression(fn: string): string {
  const cachedResult = parseResultsCache[fn];
  if (cachedResult !== void 0) {
    return cachedResult;
  }
  /* tslint:disable:max-line-length */
  // const classic = /^function\s*(?:[$_\w\d]?)\s*\([$_\w\d]+\)\s*\{(?:\s*"use strict";)?(?:[$_\s\w\d\/\*.['"\]+;]+)?\s*return\s+[$_\w\d]+\.([$_\w\d\.]+)\s*;?\s*\}$/;
  const classic = /^function\s*(?:[$_\w\d]+)?\s*\([$_\w\d]+\)\s*\{(?:\s*"use strict";)?(?:[$_\s\w\d\/\*.['"\]+;]+)?\s*return\s+[$_\w\d]+\.([$_\w\d\.]+)\s*;?\s*\}$/;
  /* tslint:enable:max-line-length */
  const arrow = /^\(?[$_\w\d]+\)?\s*=>\s*[$_\w\d]+\.([$_\w\d\.]+)$/;
  const match = classic.exec(fn) || arrow.exec(fn);
  if (match === null) {
    throw new Error(`Unable to parse accessor function:\n${fn}`);
  }
  return parseResultsCache[fn] = match[1];
}
