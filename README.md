# NG Test Tools

NG Test Tools is an opinionated library for Angular component tests based on Jasmine. It provides tools for bootstrapping tests and helpers for controlling the TestBed and the Page Objects.

## The premise

The best way to test a component is to treat it as one single unit including its code, template and style. This unit has a set of inputs (its public API and UI events) and a set of outputs (outbound event emitters and UI changes). Therefore, when we test this unit we should focus on modifying and triggering its inputs and then monitoring its outputs. Our tests should target behavior rather than implementation. The end result is a test that can only break when the component's behavior and/or API is changed.

## The method

To test a component's behavior we wrap it in a host component and drive it by modifying it's inputs. We do that by changing host properties that are bound to the component's inputs.

We analyze the behavior by spying on host callbacks that are bound to the component's outputs and monitor UI changes by watching the associated component PageObject.

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
  `
})
class HostComponent {
  titleText: string;
  content: string;
}
```

Next, we write our describe function and add the TestContext. The `TestContext.create()` takes one argument which is our host component. If we were testing a directive our setup would end here:

```typescript
describe('ExpanderComponent', () => {
  const context = TestContext.create(HostComponent).bootstrap();

  it('should create', () => {
    expect(context.host).toBeDefined();
  });
});
```

However, we are testing a component and would like our TestContext to be aware of it. Let's add it.

```typescript
describe('ExpanderComponent', () => {
  const context = TestContext.create(HostComponent)
    .withComponent(ExpanderComponent) // <-- adding the component
    .bootstrap();

  it('should create', () => {
    expect(context.component).toBeDefined();
  });
});
```

If our component has dependencies we can provide a module metadata that includes all the providers (and mocks) that are needed.

```typescript
describe('ExpanderComponent', () => {
  const context = TestContext.create(HostComponent)
    .withComponent(ExpanderComponent) // <-- adding the component
    .withMetaData({
      imports: [SomeModule],
      providers: [SomeProvider],
      declarations: [HostComponent]
    })
    .bootstrap();

  it('should create', () => {
    expect(context.component).toBeDefined();
  });
});
```

If we need to run some code before the library calls `TestBed.compileComponents()` then we can use `runBeforeCompile`.

```typescript
const context = TestContext.create(HostComponent)
  .withComponent(ExpanderComponent)
  .runBeforeCompile(() => {
    // here goes code that runs in a beforeEach
  })
  .bootstrap();
```

We can also call `useStableZone` if our component triggers some zone tasks in its initialization code.

```typescript
const context = TestContext.create(HostComponent)
  .withComponent(ExpanderComponent)
  .useStableZone()
  .bootstrap();
```

Our test is set up and we are ready to write some tests!

#### The TestContext builder API

- `create(hostComponent: Type<THost>)` - creates a context for the host component provided
- `withComponent(component: Type<TComponent>)` - adds access to the component instance
- `withPageObject<T extends PageObject>(pageObject: T)` - instantiates a PageObject with the type provided and adds access to it
- `withMetaData(metadata: TestModuleMetadata)` - overrides the default module metadata used for the test
- `useStableZone()` - waits for any async tasks triggered by component initiation to complete
- `runBeforeCompile(func: ()=>void)` - allows to run code in a `beforeEach` statement before calling `TestBed.compileComponents()`
- `bootstrap()` - bootstraps the test fixture, compiles the components and populates all the references.

### Working with the TestContext

The context we created above contains a few properties and utility methods for commonly used actions.

#### Properties

- `component` - holds the component instance created after compilation (will be undefined if we didn't use `withComponent`)
- `element` - holds the reference to the HTML element holding the component
- `fixture` - holds the reference to the TestFixture that was created by the TestBed
- `host` - holds the host instance created after compilation
- `pageObject` - holds the reference for the PageObject instance that was created by the library (will be undefined if we didn't use `withPageObject`)

#### Methods

- `detectChanges` - a shortcut to `fixture.detectChanges`
- `resetComponentReference` - queries the `debugElement` for the component instance and repopulates it and the PageObject (if applicable).
- `setHostProp(propObject, callDetectChanges)` - a helper function to modify host properties and an option to call \* `detectChanges` as the 2nd parameter.

### Working with PageObjects

A PageObject is a representation of component elements through code in an object oriented way. To set up a PageObject we create a class and extend the `PageObject` class.

```typescript
class ExpanderPageObject extends PageObject {}
```

Extending `PageObject` gives us access to its protected methods such as `getElement` and `getElements`. These methods help us reference elements in the DOM.

```typescript
class ExpanderPageObject extends PageObject {
  get header() {
    return this.getElement('.expander__header');
  }
  get expandedPanel() {
    return this.getElement('.expander__panel');
  }
}
```

We can use nested PageObjects to represent a structure.

```typescript
class ExpanderPageObject extends PageObject {
  get header() {
    return this.getElement('.expander__header', ExpanderHeader); // <-- referencing another PageObject
  }
  get expandedPanel() {
    return this.getElement('.expander__panel');
  }
}

class ExpanderHeader {
  get title() {
    return this.getElement('.expander__title');
  }
  get closeButton() {
    return this.getElement('.expander__close-button');
  }
}
```

Before using this PageObject we created, we first need to tell our TestContext about it.

```typescript
const context = TestContext.create(HostComponent)
  .withComponent(ExpanderComponent)
  .withPageObject(ExpanderPageObject)
  .bootstrap();
```

Then, in our tests, we can use this PageObject to navigate to the element we are monitoring.

```typescript
it('should show the correct title', () => {
  expect(ctx.pageObject.header.title).toBe(ctx.host.titleText);
});
```

#### The PageObject public API

- `__nativeElement` - access to the HTMLElement node associated with this PageObject
- `clientRect` - shortcut reference to `nativeElement.getBoundingClientRect()`
- `innerText` - shortcut reference to `nativeElement.innerText`
- `innerHTML` - shortcut reference to `nativeElement.innerHTML`

##### Methods

- `click()` - shortcut reference to `nativeElement.click()`
- `dispatchEvent(event: Event)` - shortcut reference to `nativeElement.dispatchEvent(event)`
- `focus()` - shortcut reference to `nativeElement.focus()`
- `getAttribute(key: string)` - shortcute reference to `nativeElement.getAttribute(key)`
