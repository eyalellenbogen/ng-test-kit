import { PageObject } from './page-object';
import { Type } from '@angular/core';
import { TestModuleMetadata, TestBed, ComponentFixture, async, waitForAsync } from '@angular/core/testing';
import { BaseTestContext, getStableTestContext, getTestContext } from './core';
import { By } from '@angular/platform-browser';
import { ComponentHarness, HarnessLoader, HarnessQuery } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

export interface ITestContext<H> {
  fixture: ComponentFixture<H>;
  host: H;
  element: HTMLElement;
  harnessLoader: HarnessLoader;
  harnessRootLoader: HarnessLoader;
  detectChanges: () => void;
  setHostProp: (updates: Partial<H>, detectChanges?: boolean) => void;
  /**
   * compiles and resets context fields with the newly created fixture
   */
  bootstrap: () => void;
  /**
   * compiles and resets context fields with the newly created fixture and
   * then waits for zone to have no more tasks in queue
   */
  bootstrapStable: () => Promise<void>;
}

export interface IComponentTestContext<T, H, P extends PageObject, CH extends ComponentHarness> extends ITestContext<H> {
  component: T;
  pageObject: P;
  componentHarness: CH;
  resetComponentReference: () => void;
}

export class TestContextBuilder<
  H,
  C,
  P extends PageObject,
  CH extends ComponentHarness = ComponentHarness,
  TCtx extends ITestContext<H> | IComponentTestContext<C, H, P, CH> = ITestContext<H>
> {
  private component: Type<C>;
  private componentHarness: HarnessQuery<CH>;
  private moduleMetadata: TestModuleMetadata;
  private pageObject: Type<P>;
  private beforeCompileFuncs: (() => void)[] = [];

  /**
   * Creates a new TestContext instance from the @host type
   */
  static create<H>(host: Type<H>) {
    return new TestContextBuilder(host);
  }

  constructor(private host: Type<H>) {}

  /**
   * Sets the moduleMetadata explicitly
   */
  public withMetadata(moduleMetadata?: TestModuleMetadata) {
    this.moduleMetadata = moduleMetadata;
    return this;
  }

  /**
   * Resolves the child Component after bootstrapping
   */
  public withComponent<TComp extends C>(component: Type<TComp>) {
    this.component = component;
    return (this as unknown) as TestContextBuilder<H, TComp, P, CH, IComponentTestContext<TComp, H, P, CH>>;
  }

  public withHarness<TCH extends CH>(componentHarnessType: HarnessQuery<TCH>) {
    if (!this.component) {
      throw Error(`TestContext: Can't call withPageObject before calling withComponent`);
    }
    this.componentHarness = componentHarnessType as HarnessQuery<TCH>;
  }

  /**
   * Populates the PageObject type provided after bootstrapping
   */
  public withPageObject<TPo extends P>(pageObjectType: Type<TPo>) {
    if (!this.component) {
      throw Error(`TestContext: Can't call withPageObject before calling withComponent`);
    }
    this.pageObject = pageObjectType as Type<P>;
    return (this as unknown) as TestContextBuilder<H, C, TPo, CH, IComponentTestContext<C, H, TPo, CH>>;
  }

  /**
   * Will run funcToExecute in a beforeEach call right before calling TestBed.createComponent()
   */
  public runBeforeTestBedCompile(funcToExecute: () => void) {
    this.beforeCompileFuncs.push(funcToExecute);
    return this;
  }

  /**
   * Builds a new context object
   */
  public build() {
    this.setupModule();
    this.bootstrapTestModule();

    const context = this.createContext();
    return context;
  }

  private createContext() {
    const context = {} as TCtx;
    context.bootstrap = () => {
      this.getAndPopulateContext(context);
    };
    context.bootstrapStable = async () => {
      await this.getAndPopulateStableContext(context);
    };
    return context;
  }

  private populateContext(baseContext: BaseTestContext<H>, targetContext: TCtx) {
    populateContext(baseContext, targetContext, this.component, this.pageObject, this.componentHarness);
    baseContext.detectChanges();
  }

  private async getAndPopulateStableContext(context: TCtx) {
    const ctx = await getStableTestContext(this.host);
    this.populateContext(ctx, context);
  }

  private getAndPopulateContext(context: TCtx) {
    const ctx = getTestContext(this.host);
    this.populateContext(ctx, context);
  }

  private setupModule() {
    if (this.moduleMetadata) {
      this.moduleMetadata.declarations = this.moduleMetadata.declarations || [];
      this.moduleMetadata.declarations.push(this.host);
    } else {
      this.moduleMetadata = {};
      this.moduleMetadata.declarations = [this.host];
      if (this.component) {
        this.moduleMetadata.declarations.push(this.component);
      }
    }
  }

  private async bootstrapTestModule() {
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

function populateContext<C, H, P extends PageObject, CH extends ComponentHarness>(
  sourceContext: BaseTestContext<H>,
  targetContext: ITestContext<H> | IComponentTestContext<C, H, P, CH>,
  component: Type<C>,
  pageObject: Type<P>,
  componentHarness: HarnessQuery<CH>
) {
  targetContext.fixture = sourceContext.fixture;
  targetContext.detectChanges = sourceContext.detectChanges;
  targetContext.host = sourceContext.component;
  targetContext.element = sourceContext.element;

  targetContext.setHostProp = (updates, detectChanges = true) => {
    Object.keys(updates).forEach((k) => {
      const key = k as keyof H;
      targetContext.host[key] = updates[key];
    });
    if (detectChanges) {
      targetContext.detectChanges();
    }
  };

  populateContextComponent(targetContext as IComponentTestContext<C, H, P, CH>, component, pageObject, componentHarness);
}

async function populateContextComponent<C, H, P extends PageObject, CH extends ComponentHarness>(
  ctx: IComponentTestContext<C, H, P, CH>,
  component: Type<C>,
  pageObject: Type<P>,
  componetHarness: HarnessQuery<CH>
) {
  const testedComponent = ctx.fixture.debugElement.query(By.directive(component));
  ctx.component = testedComponent.componentInstance;

  if (componetHarness) {
    ctx.harnessLoader = TestbedHarnessEnvironment.loader(ctx.fixture);
    ctx.harnessRootLoader = TestbedHarnessEnvironment.documentRootLoader(ctx.fixture);

    ctx.componentHarness = await ctx.harnessLoader.getHarness(componetHarness);
  }

  if (pageObject) {
    ctx.pageObject = new pageObject(testedComponent.nativeElement);
  }
}
