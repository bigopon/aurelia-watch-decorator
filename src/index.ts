/// <reference path="./interfaces.d.ts" />

import {
  patchController,
} from './patch-controller';

export {
  IPropertyAccessFn,
  IWatcherCallback,
  IWatchConfiguration,
  IScopeExpressionObserver,
} from './interfaces';

export {
  ScopeExpressionObserver,
} from './scope-expression-observer';

export {
  watch,
} from './decorator-watch';
// if just need static configuration
// then can ignore watch export and call patchController() only
export {
  patchController,
}
