import { ComponentHarness, HarnessQuery } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Type } from '@angular/core';
import { ComponentFixture, TestBed, TestModuleMetadata, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BaseTestContext, getStableTestContext, getTestContext } from './core';

interface IBaseContext<T> {
  fixture: ComponentFixture<T>;
  element: HTMLElement;
  detectChanges: () => void;
  /**
   * compiles and resets context fields with the newly created fixture
   */
  bootstrap: () => Promise<void>;
  /**
   * compiles and resets context fields with the newly created fixture and
   * then waits for zone to have no more tasks in queue
   */
  bootstrapStable: () => Promise<void>;
}

interface IDecoratedComponent extends Type<any> {
  __annotations__: { selector: string; template: string }[];
}

interface IHostContext<H> {
  host: H;
  setHostProps: (updates: Partial<Record<keyof H, H[keyof H]>>, detectChanges?: boolean) => void;
}

interface IComponentContext<C> {
  component: C;
}

interface IHarnessContext<CH extends ComponentHarness> {
  harness: CH;
}

interface IBuilder<C, CTX extends IBaseContext<C>, Omissions extends string = never> {
  withHarness<CH extends ComponentHarness>(
    harness: HarnessQuery<CH>
  ): Omit<IBuilder<C, CTX & IHarnessContext<CH>, Omissions | 'withHarness'>, Omissions | 'withHarness'>;
  withMetadata(moduleMetadata?: TestModuleMetadata): Omit<IBuilder<C, CTX, Omissions | 'withMetadata'>, Omissions | 'withMetadata'>;
  runBeforeTestBedCompile(
    funcToExecute: () => void
  ): Omit<IBuilder<C, CTX, Omissions & 'runBeforeTestBedCompile'>, Omissions | 'runBeforeTestBedCompile'>;
  build(): CTX;
  buildAndBootstrap(stable?: boolean): CTX;
}

class ContextBuilder<C, H, CTX extends IBaseContext<H>, Omissions extends string = never> implements IBuilder<H, CTX, Omissions> {
  protected moduleMetadata: TestModuleMetadata;
  protected beforeCompileFuncs: (() => void)[] = [];
  protected harness: HarnessQuery<ComponentHarness>;
  private mainComponent: Type<any>;

  constructor(protected component?: Type<C>, protected host?: Type<H>) {
    this.mainComponent = host || component;
  }

  withHarness<CH extends ComponentHarness>(harness: HarnessQuery<CH>): any {
    this.harness = harness;
    return this;
  }

  withMetadata(moduleMetadata?: TestModuleMetadata): any {
    this.moduleMetadata = moduleMetadata;
    return this;
  }

  runBeforeTestBedCompile(funcToExecute: () => void): any {
    this.beforeCompileFuncs.push(funcToExecute);
    return this;
  }

  build(): CTX {
    this.setupModule();
    this.bootstrapTestModule();
    const context = this.createContext();
    return context;
  }

  buildAndBootstrap(stable?: boolean): CTX {
    const ctx = this.build();
    beforeEach(async () => {
      stable ? await ctx.bootstrapStable() : await ctx.bootstrap();
    });
    return ctx;
  }

  private setupHost(hostDef: { props: Record<string, string> }) {
    const selector = (this.host as IDecoratedComponent).__annotations__[0].selector;
  }

  protected createContext() {
    const context = {} as CTX;
    context.bootstrap = async () => {
      await this.getAndPopulateContext(context);
      // this.setupHost();
    };
    context.bootstrapStable = async () => {
      await this.getAndPopulateStableContext(context);
    };
    return context;
  }

  private async getAndPopulateStableContext(context: CTX) {
    const ctx = await getStableTestContext(this.mainComponent);
    await populateContext(ctx, context, this.host as any, this.component, this.harness);
  }

  private async getAndPopulateContext(context: CTX) {
    if (context.fixture) {
      context.fixture.destroy();
    }
    const ctx = getTestContext(this.mainComponent);
    await populateContext(ctx, context, this.host as any, this.component, this.harness);
  }

  protected setupModule() {
    if (this.moduleMetadata) {
      this.moduleMetadata.declarations = this.moduleMetadata.declarations || [];
    } else {
      this.moduleMetadata = { declarations: [] };
    }
    if (this.component) {
      this.moduleMetadata.declarations.push(this.component);
    }
    if (this.host) {
      this.moduleMetadata.declarations.push(this.host);
    }
  }

  protected async bootstrapTestModule() {
    beforeEach(
      waitForAsync(async () => {
        TestBed.configureTestingModule(this.moduleMetadata);
        this.beforeCompileFuncs.forEach((fn) => {
          fn();
        });
        await TestBed.compileComponents();
      })
    );
  }
}

async function populateContext<C, H, CH extends ComponentHarness>(
  sourceContext: BaseTestContext<H>,
  targetContext: IBaseContext<H>,
  host?: H,
  testedComponent?: Type<C>,
  harness?: HarnessQuery<CH>
) {
  targetContext.fixture = sourceContext.fixture;
  targetContext.detectChanges = sourceContext.detectChanges;
  targetContext.element = sourceContext.element;
  if (host) {
    populateHostContext(targetContext as any, sourceContext.component);
  }
  if (testedComponent) {
    populateContextComponent(targetContext as any, host ? testedComponent : (targetContext.fixture.componentInstance as any));
  }
  if (harness) {
    await populateContextHarness(targetContext as any, harness, !!host);
  }
  targetContext.detectChanges();
}

function populateHostContext<H>(context: IBaseContext<H> & IHostContext<H>, host: H) {
  context.host = host;
  context.setHostProps = (updates, detectChanges = true) => {
    Object.keys(updates).forEach((k) => {
      const key = k as keyof H;
      context.host[key] = updates[key];
    });
    if (detectChanges) {
      context.detectChanges();
    }
  };
}

function populateContextComponent<C>(ctx: IBaseContext<C> & IComponentContext<C>, component: Type<C> | C) {
  if (typeof component === 'function') {
    const testedComponent = ctx.fixture.debugElement.query(By.directive(component as Type<C>));
    if (!testedComponent) {
      throw Error(`Component wasn't found in debugElement. Make sure you add it to the template and to the declarations.`);
    }
    ctx.component = testedComponent.componentInstance;
  } else {
    ctx.component = component;
  }
}

async function populateContextHarness<C, CH extends ComponentHarness>(
  ctx: IBaseContext<C> & IHarnessContext<CH>,
  harness: HarnessQuery<CH>,
  withHost?: boolean
) {
  const harnessLoader = TestbedHarnessEnvironment.loader(ctx.fixture, {
    queryFn: (selector, el) => {
      if (withHost) {
        return el.querySelectorAll(selector);
      }
      return [el];
    },
  });
  ctx.harness = await harnessLoader.getHarness(harness);
}

export class TestContextBuilder {
  static forComponent<C>(comp: Type<C>): IBuilder<C, IBaseContext<C> & IComponentContext<C>> {
    return new ContextBuilder(comp);
  }

  static forHostedComponent<C, H>(host: Type<H>, comp: Type<C>): IBuilder<H, IBaseContext<H> & IComponentContext<C> & IHostContext<H>> {
    return new ContextBuilder(comp, host);
  }

  static forHostedTemplate<H>(
    host: Type<H>
  ): Omit<IBuilder<H, IBaseContext<H> & IHostContext<H>>, 'withHarness' | 'withComponent' | 'withHost'> {
    return new ContextBuilder(undefined, host);
  }
}
