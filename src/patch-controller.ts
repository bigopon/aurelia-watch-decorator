import { Controller, ViewResources, HtmlBehaviorResource } from 'aurelia-templating';
import { IWatchConfiguration, Constructable, INormalizedWatchConfiguration, IScopeExpressionObserver } from './interfaces';
import { Parser, Scope, createOverrideContext, ObserverLocator } from 'aurelia-binding';
import { ScopeExpressionObserver } from './scope-expression-observer';

let patched = false;
const $O = Object;
export function patchController() {
  if (patched) {
    return;
  }
  patched = true;
  ((controllerPrototype) => {
    controllerPrototype.bind = ((bindFn) => function bind(this: Controller) {
      if (this.shouldWatch) {
        if (!this.$obs) {
          this.$obs = createObservers(this);
        }
        this.$obs.forEach(startObserver);
      }
      return bindFn.apply(this, arguments);
    })(controllerPrototype.bind);
  
    controllerPrototype.unbind = ((unbindFn) => function unbind(this: Controller) {
      if (this.shouldWatch) {
        // avoid giving the impression that it's safe to rely on watchers during unbind
        // when everything has gotten disposed
        // change propagation won't happen as expected, it happens on next tick after unbind
        this.$obs.forEach(stopObserver);
      }
      const originalReturn = unbindFn.apply(this, arguments);
      return originalReturn;
    })(controllerPrototype.unbind);

    $O.defineProperty(controllerPrototype, 'shouldWatch', {
      configurable: true,
      get(this: Controller): boolean {
        if (this.behavior.hasWatches) {
          return true;
        }
        const Ctor = this.viewModel.constructor as Constructable & { $watch?: IWatchConfiguration[] };
        return Ctor !== $O && Ctor.$watch != null;
      },
    });
  })(Controller.prototype);

  HtmlBehaviorResource.prototype.hasWatches = false;
}

const noConfiguration: IWatchConfiguration[] = [];
const _$noConfiguration: INormalizedWatchConfiguration[] = [];
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
  // @ts-ignore
  if (Ctor !== $O && !Ctor._$w) {
    Ctor._$w = normalizeWatchConfiguration(Ctor.$watch || noConfiguration)
  }

  return behavior
    ._$w
    .concat(Ctor._$w || _$noConfiguration)
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

function startObserver(obs: IScopeExpressionObserver) {
  obs.start();
}

function stopObserver(obs: IScopeExpressionObserver) {
  obs.stop();
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
