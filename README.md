# NG Test Tools

NG Test Tools is an opinionated library for Angular component tests based on Jasmine. It provides tools for bootstrapping tests and helpers for controlling the TestBed and the Component Harnesses.

## The premise

The best way to test a component is to treat it as one single unit including its code, template and style. This unit has a set of inputs (its public API and UI events) and a set of outputs (outbound event emitters and UI changes). Therefore, when we test this unit we should focus on modifying and triggering its inputs and then monitoring its outputs. Our tests should target behavior rather than implementation. The end result is a test that can only break when the component's behavior and/or API is changed.

## The method

To test a component's behavior we wrap it in a host component and drive it by modifying it's inputs. We do that by changing host properties that are bound to the component's inputs.

We analyze the behavior by spying on host callbacks that are bound to the component's outputs and monitor UI changes by watching the associated ComponentHarness.

## The details

The following information demonstrates how to set up a test for a simple component using this library. We are going to deal with a simple expander component. This component has a title. When clicking the title it expands a panel with more content. Clicking the title a second time closes that panel.

### Setting up

First, we need a host component to load our expander component.

```typescript
@Component({
  template: `
    <lib-expander [title]="titleText">
      {{ content }}
    </lib-expander>
  `,
})
class HostComponent {
  titleText: string;
  content: string;
}
```

Next, we write our describe function and add the TestContext. The `TestContextBuilder.forComponent()` takes one argument which is our component. If we were testing a directive our setup would end here:

```typescript
describe('ExpanderComponent', () => {
  const context = TestContextBuilder.forComponent(HostComponent).build();

  beforeEach(async () => {
    await context.bootstrap();
  });

  it('should create', () => {
    expect(context.host).toBeDefined();
  });
});
```

However, we are testing a component and would like our TestContext to be aware of it. Let's add it.

```typescript
describe('ExpanderComponent', () => {
  const context = TestContextBuilder.forHostedComponent(HostComponent, ExpanderComponent)
    .buildAndBootstrap(); // shortcut to bootstrapping in a beforeEach

  it('should create', () => {
    expect(context.component).toBeDefined();
  });
});
```

If our component has dependencies we can provide a module metadata that includes all the providers (and mocks) that are needed.

```typescript
describe('ExpanderComponent', () => {
  const context = TestContextBuilder.forHostedComponent(HostComponent, ExpanderComponent)
    .withMetaData({
      imports: [SomeModule],
      providers: [SomeProvider],
      declarations: [HostComponent],
    })
    .build();

  beforeEach(async () => {
    await context.bootstrap();
  });

  it('should create', () => {
    expect(context.component).toBeDefined();
  });
});
```

If we need to run some code before the library calls `TestBed.compileComponents()` then we can use `runBeforeTestBedCompile`.

```typescript
const context = TestContext.forHostedComponent(HostComponent, ExpanderComponent)
  .runBeforeTestBedCompile(() => {
    // here goes code that runs in a beforeEach
  })
  .build();
```

We can also call `bootstrapStable` if our component triggers some zone tasks in its initialization code.

```typescript
const context = TestContext.forHostedComponent(HostComponent, ExpanderComponent).build();

beforeEach(async () => {
  await context.bootstrapStable();
});
```

Our context is set up and we are ready to write some tests!

    #### The TestContext builder API

- `forComponent(component: Type<TComp>)` - creates a context for the host component provided
- `forHostedComponent(host: Type<THost>, component: Type<TComp>)` - creates a context for the host and the component provided
- `withHarness<T extends ComponentHarness>(harness: T)` - instantiates a ComponentHarness with the type provided and adds access to it
- `withMetaData(metadata: TestModuleMetadata)` - overrides the default module metadata used for the test
- `runBeforeCompile(func: ()=>void)` - allows to run code in a `beforeEach` statement before calling `TestBed.compileComponents()`
- `build()` - builds a new text context for us to use
- `buildAndBootstrap()` - builds a new text context and bootstraps it in a `beforeEach()`

### Working with the TestContext

The context we created above contains a few properties and utility methods for commonly used actions.

#### Properties

- `component` - holds the component instance created after compilation (will be undefined if we didn't use `withComponent`)
- `element` - holds the reference to the HTML element holding the component
- `fixture` - holds the reference to the TestFixture that was created by the TestBed
- `host` - holds the host instance created after compilation
- `harness` - holds the reference for the ComponentHarness instance that was created by the library (will be undefined if we didn't use `withHarness`)

#### Methods

- `bootstrap` - bootstraps the fixture and the context (to be used in a `beforeEach`)
- `bootstrapStable` - bootstraps the fixture and the context and waits for zone task queue to empty (to be used in a `beforeEach`)
- `detectChanges` - a shortcut to `fixture.detectChanges`
- `setHostProp(propObject, callDetectChanges)` - a helper function to modify host properties and an option to call `detectChanges` as the 2nd parameter.

### Working with Harnesses

A ComponentHarness is a representation of component elements through code in an object oriented way. To set up a ComponentHarness we create a class and extend the CDK's `ComponentHarness` class.

```typescript
class ExpanderHarness extends ComponentHarness {
  statis hostSelector = '.app-expander';
  public getTitleElement = this.loaderFor('.app-expander__title');
}
```

For more information about using Harnesses see the [Angular CDK Harnesses](https://material.angular.io/cdk/test-harnesses/overview).

In order to use our Harness we first need to tell our TestContext about it.

```typescript
const context = TestContextBuilder.forHostedComponent(HostComponent, ExpanderComponent).withHarness(ExpanderHarness).buildAndBootstrap();
```

Then, in our tests, we can use this Harness to navigate to the element we are monitoring.

```typescript
it('should show the correct title', async () => {
  const title = await ctx.harness.getTitleElement();
  const titleText = await title.text();
  expect(titleText).toBe(ctx.host.titleText);
});
```
