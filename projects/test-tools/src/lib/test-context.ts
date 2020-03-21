import { PageObject } from './page-object';
import { Type } from '@angular/core';
import { TestModuleMetadata, TestBed, ComponentFixture } from '@angular/core/testing';
import { BaseTestContext, getStableTestContext, getTestContext } from './core';
import { By } from '@angular/platform-browser';

export interface ITestContext<H> {
  fixture: ComponentFixture<H>;
  host: H;
  element: HTMLElement;
  // resolveInjectable: <T>(injectable: Type<T>) => T;
  detectChanges: () => void;
  setHostProp: (updates: Partial<H>, detectChanges?: boolean) => void;
}

export interface IComponentTestContext<T, H, P extends PageObject> extends ITestContext<H> {
  component: T;
  pageObject: P;
  resetComponentReference: () => void;
}

export class TestContext<H, C, P extends PageObject, TCtx extends ITestContext<H> | IComponentTestContext<C, H, P> = ITestContext<H>> {
  private component: Type<C>;
  private moduleMetadata: TestModuleMetadata;
  private useStable: boolean;
  private pageObject: Type<P>;
  private beforeCompileFuncs: (() => void)[] = [];

  /**
   * Creates a new TestContext instance from the @host type
   */
  static create<H>(host: Type<H>) {
    return new TestContext(host);
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
    return (this as unknown) as TestContext<H, TComp, P, IComponentTestContext<TComp, H, P>>;
  }

  public useStableZone() {
    this.useStable = true;
    return this;
  }

  /**
   * Populates the PageObject type provided after bootstrapping
   */
  public withPageObject<TPo extends P>(pageObjectType: Type<TPo>) {
    if (!this.component) {
      throw Error(`TestContext: Can't call withPageObject before calling withComponent`);
    }
    this.pageObject = pageObjectType as Type<P>;
    return (this as unknown) as TestContext<H, C, TPo, IComponentTestContext<C, H, TPo>>;
  }

  /**
   * Will run funcToExecute in a beforeEach call right before calling TestBed.createComponent()
   */
  public runBeforeCompile(funcToExecute: () => void) {
    this.beforeCompileFuncs.push(funcToExecute);
    return this;
  }

  /**
   * Bootstraps a new context object
   */
  public bootstrap() {
    this.setupModule();
    this.bootstrapTestModule();
    const context = {
      resetComponentReference() {
        this.populateContextComponent(this, this.component, this.pageObject);
      }
    } as TCtx;

    if (this.useStable) {
      beforeEach(done => {
        getStableTestContext(this.host).then(ctx => {
          this.populateContext(ctx, context);
          ctx.detectChanges();
          done();
        });
      });
    } else {
      beforeEach(() => {
        const ctx = getTestContext(this.host);
        this.populateContext(ctx, context);
        ctx.detectChanges();
      });
    }
    return context;
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

  private bootstrapTestModule() {
    beforeEach(done =>
      (async () => {
        TestBed.configureTestingModule(this.moduleMetadata);
        this.beforeCompileFuncs.forEach(fn => {
          fn();
        });
        await TestBed.compileComponents();
        done();
      })()
        .then(done)
        .catch(done.fail)
    );
  }

  private populateContext(sourceContext: BaseTestContext<H>, targetContext: ITestContext<H> | IComponentTestContext<C, H, P>) {
    targetContext.fixture = sourceContext.fixture;
    targetContext.detectChanges = sourceContext.detectChanges;
    targetContext.host = sourceContext.component;
    targetContext.element = sourceContext.element;

    targetContext.setHostProp = (updates, detectChanges?: boolean) => {
      Object.keys(updates).forEach(k => {
        const key = k as keyof H;
        targetContext.host[key] = updates[key];
      });
      if (detectChanges) {
        targetContext.detectChanges();
      }
    };

    this.populateContextComponent(targetContext as IComponentTestContext<C, H, P>);
  }

  private populateContextComponent(ctx: IComponentTestContext<C, H, P>) {
    if (!this.component) {
      return;
    }
    const testedComponent = ctx.fixture.debugElement.query(By.directive(this.component));
    ctx.component = testedComponent.componentInstance;
    if (this.pageObject) {
      ctx.pageObject = new this.pageObject(testedComponent.nativeElement);
    }
  }
}
