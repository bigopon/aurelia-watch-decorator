import { Controller, HtmlBehaviorResource, ViewResources } from 'aurelia-templating';
import { connectable as connectable$1, Parser, ObserverLocator, createOverrideContext } from 'aurelia-binding';
import { metadata } from 'aurelia-metadata';

var connectable = connectable$1;
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
    ScopeExpressionObserver.prototype.start = function () {
        this.oldValue = this.expression.evaluate(this.scope, this.lookupFunctions);
        this.expression.connect(this, this.scope);
    };
    ScopeExpressionObserver.prototype.stop = function () {
        this.unobserve(true);
        this.oldValue = void 0;
    };
    return ScopeExpressionObserver;
}());
// use this instead of decorator to avoid extra generated code
connectable()(ScopeExpressionObserver);

var patched = false;
var $O = Object;
function patchController() {
    if (patched) {
        return;
    }
    patched = true;
    (function (controllerPrototype) {
        controllerPrototype.bind = (function (bindFn) { return function bind() {
            if (this.shouldWatch) {
                if (!this.$obs) {
                    this.$obs = createObservers(this);
                }
                this.$obs.forEach(startObserver);
            }
            return bindFn.apply(this, arguments);
        }; })(controllerPrototype.bind);
        controllerPrototype.unbind = (function (unbindFn) { return function unbind() {
            if (this.shouldWatch) {
                // avoid giving the impression that it's safe to rely on watchers during unbind
                // when everything has gotten disposed
                // change propagation won't happen as expected, it happens on next tick after unbind
                this.$obs.forEach(stopObserver);
            }
            var originalReturn = unbindFn.apply(this, arguments);
            return originalReturn;
        }; })(controllerPrototype.unbind);
        $O.defineProperty(controllerPrototype, 'shouldWatch', {
            configurable: true,
            get: function () {
                if (this.behavior.hasWatches) {
                    return true;
                }
                var Ctor = this.viewModel.constructor;
                return Ctor !== $O && Ctor.$watch != null;
            },
        });
    })(Controller.prototype);
    HtmlBehaviorResource.prototype.hasWatches = false;
}
var noConfiguration = [];
var _$noConfiguration = [];
function createObservers(controller) {
    var container = controller.container;
    var behavior = controller.behavior;
    var viewModel = controller.viewModel;
    var parser = container.get(Parser);
    var lookupFunctions = container.get(ViewResources).lookupFunctions;
    var observerLocator = container.get(ObserverLocator);
    var Ctor = viewModel.constructor;
    var scope = {
        bindingContext: viewModel,
        overrideContext: createOverrideContext(viewModel)
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
        .concat(Ctor._$w || _$noConfiguration)
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
function startObserver(obs) {
    obs.start();
}
function stopObserver(obs) {
    obs.stop();
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
        var behaviorMetadata = metadata.getOrCreateOwn(metadata.resource, HtmlBehaviorResource, ctor);
        var watchExpressions = behaviorMetadata.$watch = (behaviorMetadata.$watch || []);
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

export { ScopeExpressionObserver, patchController, watch };
//# sourceMappingURL=index.js.map
