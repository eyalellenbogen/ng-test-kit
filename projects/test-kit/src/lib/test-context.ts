import { Type } from '@angular/core';
import { TestModuleMetadata, TestBed, ComponentFixture, async, waitForAsync } from '@angular/core/testing';
import { BaseTestContext, getStableTestContext, getTestContext } from './core';
import { By } from '@angular/platform-browser';
import { ComponentHarness, HarnessQuery } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

export interface ITestContext<H> {
  fixture: ComponentFixture<H>;
  host: H;
  element: HTMLElement;
  detectChanges: () => void;
  setHostProp: (updates: Partial<H>, detectChanges?: boolean) => void;
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

export interface IComponentTestContext<T, H, CH extends ComponentHarness> extends ITestContext<H> {
  component: T;
  harness: CH;
  resetComponentReference: () => void;
}

export class TestContextBuilder<
  H,
  C,
  CH extends ComponentHarness = ComponentHarness,
  TCtx extends ITestContext<H> | IComponentTestContext<C, H, CH> = ITestContext<H>
> {
  private component: Type<C>;
  private componentHarness: HarnessQuery<CH>;
  private moduleMetadata: TestModuleMetadata;
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
    return (this as unknown) as TestContextBuilder<H, TComp, CH, IComponentTestContext<TComp, H, CH>>;
  }

  public withHarness<TCH extends CH>(componentHarnessType: HarnessQuery<TCH>) {
    if (!this.component) {
      throw Error(`TestContext: Can't call withHarness before calling withComponent`);
    }
    this.componentHarness = componentHarnessType as HarnessQuery<TCH>;
    return (this as unknown) as TestContextBuilder<H, C, TCH, IComponentTestContext<C, H, TCH>>;
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
    context.bootstrap = async () => {
      await this.getAndPopulateContext(context);
    };
    context.bootstrapStable = async () => {
      await this.getAndPopulateStableContext(context);
    };
    return context;
  }

  private async populateContext(baseContext: BaseTestContext<H>, targetContext: TCtx) {
    await populateContext(baseContext, targetContext, this.component, this.componentHarness);
    baseContext.detectChanges();
  }

  private async getAndPopulateStableContext(context: TCtx) {
    const ctx = await getStableTestContext(this.host);
    await this.populateContext(ctx, context);
  }

  private async getAndPopulateContext(context: TCtx) {
    const ctx = getTestContext(this.host);
    await this.populateContext(ctx, context);
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

async function populateContext<C, H, CH extends ComponentHarness>(
  sourceContext: BaseTestContext<H>,
  targetContext: ITestContext<H> | IComponentTestContext<C, H, CH>,
  component: Type<C>,
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

  await populateContextComponent(targetContext as IComponentTestContext<C, H, CH>, component, componentHarness);
}

async function populateContextComponent<C, H, CH extends ComponentHarness>(
  ctx: IComponentTestContext<C, H, CH>,
  component: Type<C>,
  componetHarness: HarnessQuery<CH>
) {
  const testedComponent = ctx.fixture.debugElement.query(By.directive(component));
  ctx.component = testedComponent.componentInstance;
  if (componetHarness) {
    const harnessLoader = TestbedHarnessEnvironment.loader(ctx.fixture);
    ctx.harness = await harnessLoader.getHarness(componetHarness);
  }
}
