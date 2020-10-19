import { PageObject } from './page-object';
import { Type } from '@angular/core';
import { TestModuleMetadata, TestBed, ComponentFixture, async } from '@angular/core/testing';
import { BaseTestContext, getStableTestContext, getTestContext } from './core';
import { By } from '@angular/platform-browser';

export interface ITestContext<H> {
  fixture: ComponentFixture<H>;
  host: H;
  element: HTMLElement;
  // resolveInjectable: <T>(injectable: Type<T>) => T;
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

export interface IComponentTestContext<T, H, P extends PageObject> extends ITestContext<H> {
  component: T;
  pageObject: P;
  resetComponentReference: () => void;
}

export class TestContextBuilder<
  H,
  C,
  P extends PageObject,
  TCtx extends ITestContext<H> | IComponentTestContext<C, H, P> = ITestContext<H>
> {
  private component: Type<C>;
  private moduleMetadata: TestModuleMetadata;
  // private useStable: boolean;
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
    return (this as unknown) as TestContextBuilder<H, TComp, P, IComponentTestContext<TComp, H, P>>;
  }

  /**
   * Populates the PageObject type provided after bootstrapping
   */
  public withPageObject<TPo extends P>(pageObjectType: Type<TPo>) {
    if (!this.component) {
      throw Error(`TestContext: Can't call withPageObject before calling withComponent`);
    }
    this.pageObject = pageObjectType as Type<P>;
    return (this as unknown) as TestContextBuilder<H, C, TPo, IComponentTestContext<C, H, TPo>>;
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
    populateContext(baseContext, targetContext, this.component, this.pageObject);
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
    beforeEach(async(async () => {
      TestBed.configureTestingModule(this.moduleMetadata);
      this.beforeCompileFuncs.forEach((fn) => {
        fn();
      });
      await TestBed.compileComponents();
    }));
  }
}

function populateContext<C, H, P extends PageObject>(
  sourceContext: BaseTestContext<H>,
  targetContext: ITestContext<H> | IComponentTestContext<C, H, P>,
  component: Type<C>,
  pageObject: Type<P>
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

  populateContextComponent(targetContext as IComponentTestContext<C, H, P>, component, pageObject);
}

function populateContextComponent<C, H, P extends PageObject>(
  ctx: IComponentTestContext<C, H, P>,
  component: Type<C>,
  pageObject: Type<P>
) {
  const testedComponent = ctx.fixture.debugElement.query(By.directive(component));
  ctx.component = testedComponent.componentInstance;
  // ctx.resetComponentReference = () => {
  //   this.populateContextComponent(ctx);
  // };

  if (pageObject) {
    ctx.pageObject = new pageObject(testedComponent.nativeElement);
  }
}
