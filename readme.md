## [Aurelia Watch Decorator](https://github.com/bigopon/aurelia-watch-decorator)


### Installation

```shell
npm install aurelia-watch-decorator
```

### API

Use `@watch` decorator on a custom element, or a custom attribute class:
```ts
import { watch } from 'aurelia-watch-decorator';

@watch(...)
class Abc {}
```
Or a method of a class:
```ts
import { watch } from 'aurelia-watch-decorator';

class Abc {
  @watch(...)
  log() {}
}
```

- The decorator can be used on Custom element or Custom attribute only
- The watchers are created once, and started before `bind`, stopped before `unbind` lifecycle of custom elements/custom attributes.

#### Watch parameters
```ts
// on class
@watch(expressionOrPropertyAccessFn, changeHandlerOrCallback)
class MyClass {}

// on method
class MyClass {
  @watch(expressionOrPropertyAccessFn)
  someMethod() {}
}
```

| Name | Type | Description |
|-|-|-|
| expressionOrPropertyAccessFn | string \| IPropertyAccessFn<T> | Watch expression specifier. If a normal function or an arrow function is given, the function body will converted to string and parsed as watch expression |
| changeHandlerOrCallback | string \| IWatcherCallback<T> | The callback that will be invoked when the value evaluated from watch expression has changed. If a name is given, it will be used to resolve the callback `ONCE`. This callback will be called with 3 parameters: (1st) new value from the watched expression. (2nd) old value from the watched expression (3rd) the watched instance. And the context of the function call will be the instance, same with the 3rd parameter. |

### Usage examples

There is one main exports of this plugin: `watch`. `watch` is a decorator that can be used per following examples:

<details>
<summary>Decorating on a class, string as watch expression, with arrow function as callback</summary>

```ts
@watch('counter', (newValue, oldValue, app) => app.log(newValue))
class App {

  counter = 0;

  log(whatToLog) {
    console.log(whatToLog);
  }
}
```
</details>

<details>
<summary>Decorating on a class, string as watch expression, with method name as callback</summary>

> ❗❗❗❗ method name will be used to resolve the function `ONCE`, which means changing method after the instance has been created will not be recognised.

```ts
@watch('counter', 'log')
class App {

  counter = 0;

  log(whatToLog) {
    console.log(whatToLog);
  }
}
```
</details>

<details>
<summary>Decorating on a class, string as watch expression, with normal function as callback</summary>

```ts
@watch('counter', function(newValue, oldValue, app) {
  app.log(newValue);
  // or use this, it will point to the instance of this class
  this.log(newValue);
})
class App {

  counter = 0;

  log(whatToLog) {
    console.log(whatToLog);
  }
}
```
</details>

<details>
<summary>Decorating on a class, normal function as watch expression, with arrow function as callback</summary>

```ts
@watch(function (abc) { return counter }, (newValue, oldValue, app) => app.log(newValue))
class App {

  counter = 0;

  log(whatToLog) {
    console.log(whatToLog);
  }
}
```
</details>

<details>
<summary>Decorating on a class, arrow function as watch expression, with arrow function as callback</summary>

```ts
@watch(abc => abc.counter, (newValue, oldValue, app) => app.log(newValue))
class App {

  counter = 0;

  log(whatToLog) {
    console.log(whatToLog);
  }
}
```
</details>

<details>
<summary>Decorating on a method, string as watch expression</summary>

```ts
class App {

  counter = 0;

  @watch('counter')
  log(whatToLog) {
    console.log(whatToLog);
  }
}
```
</details>

<details>
<summary>Decorating on a method, normal function as watch expression</summary>

```ts
class App {

  counter = 0;

  @watch(function(abc) { return abc.counter })
  log(whatToLog) {
    console.log(whatToLog);
  }
}
```
</details>

<details>
<summary>Decorating on a method, arrow function as watch expression</summary>

```ts
class App {

  counter = 0;

  @watch(abc => abc.counter)
  log(whatToLog) {
    console.log(whatToLog);
  }
}
```
</details>

### Notes

- The parser for function as watch expression is somewhat naive, it won't be able to handle complex expression. And it's discouraged to do so, if you need to observe a complex computed expression, maybe try a getter.
- This plugin is planned to be a core part of v2. Please help file issues for ergonomic value of this plugin, so we can evaluate it for v2.
