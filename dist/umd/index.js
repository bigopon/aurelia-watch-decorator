(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('aurelia-templating'), require('aurelia-binding'), require('aurelia-metadata')) :
  typeof define === 'function' && define.amd ? define(['exports', 'aurelia-templating', 'aurelia-binding', 'aurelia-metadata'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.au = global.au || {}, global.au.watchDecorator = {}), global.aureliaTemplating, global.au, global.aureliaMetadata));
}(this, (function (exports, aureliaTemplating, aureliaBinding, aureliaMetadata) { 'use strict';

  var connectable = aureliaBinding.connectable;
  var ScopeExpressionObserver = /** @class */ (function () {
      function ScopeExpressionObserver(scope, expression, callback, 
      /**@internal */
      lookupFunctions, 
      /**@internal used by expression.connect */
      observerLocator) {
          this.scope = scope;
          this.expression = expression;
          this.callback = callback;
          this.lookupFunctions = lookupFunctions;
          this.observerLocator = observerLocator;
          this.scope = scope;
          this.lookupFunctions = lookupFunctions;
      }
      /**@internal */
      ScopeExpressionObserver.prototype.call = function () {
          var scope = this.scope;
          var expression = this.expression;
          var newValue = expression.evaluate(scope, this.lookupFunctions);
          var oldValue = this.oldValue;
          if (!Object.is(newValue, oldValue)) {
              this.oldValue = newValue;
              var obj = scope.bindingContext;
              this.callback.call(obj, newValue, oldValue, obj);
          }
          this._version++;
          expression.connect(this, scope);
          this.unobserve(false);
      };
      ScopeExpressionObserver.prototype.begin = function () {
          this.oldValue = this.expression.evaluate(this.scope, this.lookupFunctions);
          this.expression.connect(this, this.scope);
      };
      ScopeExpressionObserver.prototype.end = function () {
          this.unobserve(true);
          this.oldValue = void 0;
      };
      return ScopeExpressionObserver;
  }());
  // use this instead of decorator to avoid extra generated code
  connectable()(ScopeExpressionObserver);

  var patched = false;
  function patchController() {
      if (patched) {
          return;
      }
      patched = true;
      (function (controllerPrototype) {
          controllerPrototype.bind = (function (bindFn) { return function bind() {
              if (!this.$obs) {
                  this.$obs = createObservers(this);
              }
              this.$obs.forEach(beginObserver);
              return bindFn.apply(this, arguments);
          }; })(controllerPrototype.bind);
          controllerPrototype.unbind = (function (unbindFn) { return function unbind() {
              // avoid giving the impression that it's safe to rely on watchers during unbind
              // when everything has gotten disposed
              // change propagation won't happen as expected, it happens on next tick after unbind
              this.$obs.forEach(endObserver);
              var originalReturn = unbindFn.apply(this, arguments);
              return originalReturn;
          }; })(controllerPrototype.unbind);
      })(aureliaTemplating.Controller.prototype);
  }
  var noConfiguration = [];
  function createObservers(controller) {
      var container = controller.container;
      var behavior = controller.behavior;
      var viewModel = controller.viewModel;
      var parser = container.get(aureliaBinding.Parser);
      var lookupFunctions = container.get(aureliaTemplating.ViewResources).lookupFunctions;
      var observerLocator = container.get(aureliaBinding.ObserverLocator);
      var Ctor = viewModel.constructor;
      var scope = {
          bindingContext: viewModel,
          overrideContext: aureliaBinding.createOverrideContext(viewModel)
      };
      if (!behavior._$w) {
          behavior._$w = normalizeWatchConfiguration(behavior.$watch || noConfiguration);
      }
      if (!Ctor._$w) {
          Ctor._$w = normalizeWatchConfiguration(Ctor.$watch || noConfiguration);
      }
      return behavior
          ._$w
          .concat(Ctor._$w)
          .map(function (watchConfiguration) {
          var watchExpression = watchConfiguration.expression;
          var callback = watchConfiguration.callback;
          var callbackType = typeof callback;
          if (!watchExpression || !callback) {
              throw new Error("Invalid watch config. Expression: " + watchExpression + ". Callback: " + callbackType);
          }
          var expression = parser.parse(watchExpression);
          var expressionObserver = new ScopeExpressionObserver(scope, expression, callbackType === 'function'
              ? callback
              : viewModel.constructor[callback], lookupFunctions, observerLocator);
          return expressionObserver;
      });
  }
  function beginObserver(obs) {
      obs.begin();
  }
  function endObserver(obs) {
      obs.end();
  }
  function normalizeWatchConfiguration(configurations) {
      return configurations
          .map(function (watchConfiguration) {
          var expression = watchConfiguration.expression;
          return {
              expression: typeof expression === 'function'
                  ? getAccessorExpression(expression.toString())
                  : String(expression),
              callback: watchConfiguration.callback,
          };
      });
  }
  var parseResultsCache = {};
  function getAccessorExpression(fn) {
      var cachedResult = parseResultsCache[fn];
      if (cachedResult !== void 0) {
          return cachedResult;
      }
      /* tslint:disable:max-line-length */
      // const classic = /^function\s*(?:[$_\w\d]?)\s*\([$_\w\d]+\)\s*\{(?:\s*"use strict";)?(?:[$_\s\w\d\/\*.['"\]+;]+)?\s*return\s+[$_\w\d]+\.([$_\w\d\.]+)\s*;?\s*\}$/;
      var classic = /^function\s*(?:[$_\w\d]+)?\s*\([$_\w\d]+\)\s*\{(?:\s*"use strict";)?(?:[$_\s\w\d\/\*.['"\]+;]+)?\s*return\s+[$_\w\d]+\.([$_\w\d\.]+)\s*;?\s*\}$/;
      /* tslint:enable:max-line-length */
      var arrow = /^\(?[$_\w\d]+\)?\s*=>\s*[$_\w\d]+\.([$_\w\d\.]+)$/;
      var match = classic.exec(fn) || arrow.exec(fn);
      if (match === null) {
          throw new Error("Unable to parse accessor function:\n" + fn);
      }
      return parseResultsCache[fn] = match[1];
  }

  function watch(expressionOrPropertyAccessFn, changeHandlerOrCallback) {
      patchController();
      return function decorator(target, key, descriptor) {
          // class decorator?
          var isClassDecorator = key == null;
          var ctor = isClassDecorator ? target : target.constructor;
          // basic validation
          if (typeof changeHandlerOrCallback === 'string' && !(changeHandlerOrCallback in ctor.prototype)) {
              throw new Error("Invalid change handler config. Method not found in class " + ctor.name);
          }
          if (!isClassDecorator && typeof descriptor.value !== 'function') {
              throw new Error("decorated target " + String(key) + " is not a class method.");
          }
          var behaviorMetadata = aureliaMetadata.metadata.getOrCreateOwn(aureliaMetadata.metadata.resource, aureliaTemplating.HtmlBehaviorResource, ctor);
          var watchExpressions = behaviorMetadata.$watch = (behaviorMetadata.$watch || []);
          watchExpressions.push({
              expression: expressionOrPropertyAccessFn,
              callback: isClassDecorator ? changeHandlerOrCallback : descriptor.value,
          });
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