import './setup';
import { bootstrapComponent } from './utils';
import { watch } from '../src/decorator-watch';
import { TaskQueue } from 'aurelia-framework';
import { StageComponent } from 'aurelia-testing';
import { bootstrap } from 'aurelia-bootstrapper';

describe('@watch decorator', () => {
  describe('on method', () => {
    it('does nothing when there\' no @watch', async () => {
      class Abc implements IAbc {
        static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';

        counter = 10;
        barCallCount = 0;
        latestBarCallArg = undefined;
        props = {
          counter: 10,
        };

        bar(value: number): void {
          this.barCallCount++;
          this.latestBarCallArg = value;
        }

        increase() {
          this.counter++;
          this.props.counter++;
        }
      }

      const { viewModel, taskQueue, host, dispose } = await bootstrapComponent(Abc);
      expect(viewModel.counter).toBe(10);
      expect(viewModel.barCallCount).toBe(0);

      host.querySelector('button').click();
      expect(viewModel.counter).toBe(11);
      expect(viewModel.barCallCount).toBe(0);
      expect(viewModel.latestBarCallArg).toBe(undefined);
      taskQueue.flushMicroTaskQueue();
      expect(viewModel.counter).toBe(11);
      expect(viewModel.barCallCount).toBe(0, 'barCallCount should be 1');
      expect(viewModel.latestBarCallArg).toBe(undefined);

      dispose();
    });

    for (const [name, fn] of getTestCases()) {
      it(`${name} + (1). works in basic scenario`, async () => {
        class Abc implements IAbc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';

          counter = 10;
          barCallCount = 0;
          latestBarCallArg = undefined;
          props = {
            counter: 10,
          };

          @watch(fn)
          bar(value: number): void {
            this.barCallCount++;
            this.latestBarCallArg = value;
          }

          increase() {
            this.counter++;
            this.props.counter++;
          }
        }

        const { viewModel, taskQueue, host, dispose } = await bootstrapComponent(Abc);
        expect(viewModel.counter).toBe(10);
        expect(viewModel.barCallCount).toBe(0);

        host.querySelector('button').click();
        expect(viewModel.counter).toBe(11);
        expect(viewModel.barCallCount).toBe(0);
        expect(viewModel.latestBarCallArg).toBe(undefined);
        taskQueue.flushMicroTaskQueue();
        expect(viewModel.counter).toBe(11);
        expect(viewModel.barCallCount).toBe(1, 'barCallCount should be 1');
        expect(viewModel.latestBarCallArg).toBe(11);

        dispose();
      });

      it(`${name} + (2.) ignores explicit change handler`, async () => {
        class Abc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';

          counter = 0;
          barCallCount = 0;
          props = {
            counter: 10,
          };

          // @ts-ignore method decorator only accepts 1 argument
          // 2nd argument does not compiles, but it's good for assertion
          @watch(fn, () => { throw new Error('invalid') })
          bar(): void {
            this.barCallCount++;
          }

          increase() {
            this.counter++;
            this.props.counter++;
          }
        }

        const { viewModel, taskQueue, host, dispose } = await bootstrapComponent(Abc);
        expect(viewModel.counter).toBe(0);
        expect(viewModel.barCallCount).toBe(0);

        host.querySelector('button').click();
        expect(viewModel.counter).toBe(1);
        expect(viewModel.barCallCount).toBe(0);
        taskQueue.flushMicroTaskQueue();
        expect(viewModel.counter).toBe(1);
        expect(viewModel.barCallCount).toBe(1, 'barCallCount should be 1');

        dispose();
      });

      it(`${name} + (3.) works with mutation during bind`, async () => {
        class Abc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';
  
          counter = 0;
          barCallCount = 0;
          props = {
            counter: 10,
          };

          bind() {
            this.counter++;
            this.props.counter++;
          }

          @watch(fn)
          bar(): void {
            this.barCallCount++;
          }
  
          increase() {
            this.counter++;
          }
        }
        const { viewModel, dispose } = await bootstrapComponent(Abc);
        expect(viewModel.counter).toBe(1);
        expect(viewModel.barCallCount).toBe(1);

        dispose();
      });

      it(`${name} + (4.) dispose before unbind`, async () => {
        class Abc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';
          static inject = [TaskQueue];

          counter = 0;
          barCallCount = 0;
          props = {
            counter: 10,
          };

          constructor(public taskQueue: TaskQueue) {}

          bind() {
            this.counter++;
            this.props.counter++;
          }

          unbind() {
            const barCallCount = this.barCallCount;
            this.counter++;
            this.props.counter++;
            this.taskQueue.flushMicroTaskQueue();
            expect(this.barCallCount).toBe(barCallCount);
          }

          @watch(fn)
          bar(): void {
            this.barCallCount++;
          }
          
        }
        const { viewModel, dispose } = await bootstrapComponent(Abc);
        expect(viewModel.counter).toBe(1);
        expect(viewModel.barCallCount).toBe(1);

        dispose();
      });
    }
  });

  describe('on class', () => {

    for (const [name, fn] of getTestCases()) {
      it(`${name} + (1). works in basic scenario`, async () => {

        @watch(fn, (v, ov, abc) => abc.bar(v))
        class Abc implements IAbc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';

          counter = 10;
          barCallCount = 0;
          latestBarCallArg = undefined;
          props = {
            counter: 10,
          };

          bar(value: number): void {
            this.barCallCount++;
            this.latestBarCallArg = value;
          }

          increase() {
            this.counter++;
            this.props.counter++;
          }
        }

        const { viewModel, taskQueue, host, dispose } = await bootstrapComponent(Abc);
        expect(viewModel.counter).toBe(10);
        expect(viewModel.barCallCount).toBe(0);

        host.querySelector('button').click();
        expect(viewModel.counter).toBe(11);
        expect(viewModel.barCallCount).toBe(0);
        expect(viewModel.latestBarCallArg).toBe(undefined);
        taskQueue.flushMicroTaskQueue();
        expect(viewModel.counter).toBe(11);
        expect(viewModel.barCallCount).toBe(1, 'barCallCount should be 1');
        expect(viewModel.latestBarCallArg).toBe(11);

        dispose();
      });

      it(`${name} + (2.) works with mutation during bind`, async () => {
        let counterCallCount = 0;

        @watch(fn, newValue => counterCallCount++)
        class Abc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';
  
          counter = 0;
          barCallCount = 0;
          props = {
            counter: 10,
          };

          bind() {
            this.counter++;
            this.props.counter++;
          }
        }
        const { viewModel, dispose } = await bootstrapComponent(Abc);
        expect(viewModel.counter).toBe(1);
        expect(counterCallCount).toBe(1);

        dispose();
      });

      it(`${name} + (3.) works with multiple watchers`, async () => {
        let counterCallCount = 0;

        @watch(fn, newValue => counterCallCount++)
        @watch(fn, (v) => counterCallCount++)
        class Abc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';
  
          counter = 0;
          barCallCount = 0;
          props = {
            counter: 10,
          };

          bind() {
            this.counter++;
            this.props.counter++;
          }
        }
        const { viewModel, dispose } = await bootstrapComponent(Abc);
        expect(viewModel.counter).toBe(1);
        expect(counterCallCount).toBe(2);

        dispose();
      });

      it(`${name} + (4.) dispose before unbind`, async () => {
        let counterCallCount = 0;

        @watch(fn, newValue => counterCallCount++)
        class Abc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';
          static inject = [TaskQueue];

          counter = 0;
          barCallCount = 0;
          props = {
            counter: 10,
          };

          constructor(public taskQueue: TaskQueue) {}

          bind() {
            this.counter++;
            this.props.counter++;
          }

          unbind() {
            const $counterCallCount = counterCallCount;
            this.counter++;
            this.props.counter++;
            this.taskQueue.flushMicroTaskQueue();
            expect($counterCallCount).toBe(counterCallCount);
          }
        }
        const { viewModel, dispose } = await bootstrapComponent(Abc);
        expect(viewModel.counter).toBe(1);
        expect(counterCallCount).toBe(1);

        dispose();
      });

      it(`${name} + (5.) works with "aurelia-testing"`, async () => {
        let counterCallCount = 0;
        @watch(fn, newValue => counterCallCount++)
        class Abc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';
          static inject = [TaskQueue];

          counter = 0;
          barCallCount = 0;
          props = {
            counter: 10,
          };

          constructor(public taskQueue: TaskQueue) {}

          bind() {
            this.counter++;
            this.props.counter++;
          }

          unbind() {
            const $counterCallCount = counterCallCount;
            this.counter++;
            this.props.counter++;
            this.taskQueue.flushMicroTaskQueue();
            expect($counterCallCount).toBe(counterCallCount);
          }
        }

        const component = StageComponent
          .withResources(Abc as any)
          .inView('<abc></abc>')
          .boundTo({});

        await component.create(bootstrap);

        expect(counterCallCount).toBe(1);

        component.dispose().remove();
      });

      it(`${name} + (6.) works with <compose/>`, async () => {
        let counterCallCount = 0;
        let unbindCalled = false;

        @watch(fn, newValue => counterCallCount++)
        class Abc {
          static $view = '<template>\${barCallCount}<button click.trigger="increase()">+</button></template>';
          static inject = [TaskQueue];

          counter = 0;
          barCallCount = 0;
          props = {
            counter: 10,
          };

          constructor(public taskQueue: TaskQueue) {}

          bind() {
            this.counter++;
            this.props.counter++;
          }

          unbind() {
            const $counterCallCount = counterCallCount;
            this.counter++;
            this.props.counter++;
            this.taskQueue.flushMicroTaskQueue();
            expect($counterCallCount).toBe(counterCallCount);
            unbindCalled = true;
          }
        }

        const component = StageComponent
          .withResources(Abc as any)
          .inView('<compose view-model.bind="Abc"></compose>')
          .boundTo({ Abc });

        await component.create(bootstrap);
        expect(counterCallCount).toBe(1, 'counterCallCount should have been 1');

        component.dispose().remove();
        expect(unbindCalled).toBe(true);
      });
    }
  });

  function* getTestCases() {
    yield [
      '(1.) classic anonymous fn expression',
      function (abc: IAbc) { return abc.counter; },
    ];
    yield [
      '(2.) classic named fn expression',
      function counterObserver(abc: IAbc) { return abc.counter },
    ];
    yield [
      '(3.) arrow fn expression',
      (abc: IAbc) => abc.counter,
    ];
    yield [
      '(4.) classic anonymous with deep property access',
      function (abc: IAbc) { return abc.props.counter },
    ];
    yield [
      '(5.) classic named fn expression with deep prop access',
      function counterObserver5(abc: IAbc) { return abc.props.counter; },
    ];
    yield [
      '(6.) arrow fn expression with deep prop access',
      (abc: IAbc) => abc.props.counter,
    ];
    yield [
      '(7.) expression string',
      'counter'
    ];
    yield [
      '(8.) expression string with deep prop access',
      'props.counter'
    ];
  }
});

interface IAbc {
  counter: number;
  barCallCount: number;
  latestBarCallArg?: any;
  props: {
    counter: number;
  };

  bar?(v?: any): any;
}
