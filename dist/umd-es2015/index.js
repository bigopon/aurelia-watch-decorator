(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('aurelia-templating'), require('aurelia-binding'), require('aurelia-metadata')) :
  typeof define === 'function' && define.amd ? define(['exports', 'aurelia-templating', 'aurelia-binding', 'aurelia-metadata'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.au = global.au || {}, global.au.watchDecorator = {}), global.au, global.au, global.au));
}(this, (function (exports, aureliaTemplating, aureliaBinding, aureliaMetadata) { 'use strict';

  const connectable = aureliaBinding.connectable;
  class ScopeExpressionObserver {
      constructor(scope, expression, callback, 
      /**@internal */
      lookupFunctions, 
      /**@internal used by expression.connect */
      observerLocator) {
          this.scope = scope;
          this.expression = expression;
          this.callback = callback;
          this.lookupFunctions = lookupFunctions;
          this.observerLocator = observerLocator;
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

  let patched = false;
  const $O = Object;
  function patchController() {
      if (patched) {
          return;
      }
      patched = true;
      ((controllerPrototype) => {
          controllerPrototype.bind = ((bindFn) => function bind() {
              if (this.shouldWatch) {
                  if (!this.$obs) {
                      this.$obs = createObservers(this);
                  }
                  this.$obs.forEach(startObserver);
              }
              return bindFn.apply(this, arguments);
          })(controllerPrototype.bind);
          controllerPrototype.unbind = ((unbindFn) => function unbind() {
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
              get() {
                  if (this.behavior.hasWatches) {
                      return true;
                  }
                  const Ctor = this.viewModel.constructor;
                  return Ctor !== $O && Ctor.$watch != null;
              },
          });
      })(aureliaTemplating.Controller.prototype);
      aureliaTemplating.HtmlBehaviorResource.prototype.hasWatches = false;
  }
  const noConfiguration = [];
  function createObservers(controller) {
      const container = controller.container;
      const behavior = controller.behavior;
      const viewModel = controller.viewModel;
      const parser = container.get(aureliaBinding.Parser);
      const lookupFunctions = container.get(aureliaTemplating.ViewResources).lookupFunctions;
      const observerLocator = container.get(aureliaBinding.ObserverLocator);
      const Ctor = viewModel.constructor;
      const scope = {
          bindingContext: viewModel,
          overrideContext: aureliaBinding.createOverrideContext(viewModel)
      };
      if (!behavior._$w) {
          behavior._$w = normalizeWatchConfiguration(behavior.$watch || noConfiguration);
      }
      // @ts-ignore
      if (Ctor !== $O && !Ctor._$w) {
          Ctor._$w = normalizeWatchConfiguration(Ctor.$watch || noConfiguration);
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
          const expressionObserver = new ScopeExpressionObserver(scope, expression, callbackType === 'function'
              ? callback
              : viewModel.constructor[callback], lookupFunctions, observerLocator);
          return expressionObserver;
      });
  }
  function startObserver(obs) {
      obs.start();
  }
  function stopObserver(obs) {
      obs.stop();
  }
  function normalizeWatchConfiguration(configurations) {
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
  const parseResultsCache = {};
  function getAccessorExpression(fn) {
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

  function watch(expressionOrPropertyAccessFn, changeHandlerOrCallback) {
      patchController();
      return function decorator(target, key, descriptor) {
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
          const behaviorMetadata = aureliaMetadata.metadata.getOrCreateOwn(aureliaMetadata.metadata.resource, aureliaTemplating.HtmlBehaviorResource, ctor);
          const watchExpressions = behaviorMetadata.$watch = (behaviorMetadata.$watch || []);
          watchExpressions.push({
              expression: expressionOrPropertyAccessFn,
              callback: isClassDecorator ? changeHandlerOrCallback : descriptor.value,
          });
          behaviorMetadata.hasWatches = true;
          if (isClassDecorator) {
              return;
          }
          return descriptor;
      };
  }

  exports.ScopeExpressionObserver = ScopeExpressionObserver;
  exports.patchController = patchController;
  exports.watch = watch;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
