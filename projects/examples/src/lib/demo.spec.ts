import { ComponentHarness } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TestContextBuilder } from 'test-kit/public-api';

@Component({
  template: `<span>{{ text }}</span>`,
  selector: 'lib-comp',
})
class MyComponent {
  @Input() text = 'lalala';
}

@Component({
  template: `<lib-comp [text]="content"></lib-comp>`,
})
class HostComponent {
  content = '123';
}

class MyHarness extends ComponentHarness {
  static hostSelector = 'lib-comp';
  protected getLabel = this.locatorFor('span');

  public async getText() {
    return await (await this.getLabel()).text();
  }
}

describe('before test-kit', () => {
  let fixture: ComponentFixture<HostComponent>;
  let componentInstance: MyComponent;
  let harness: MyHarness;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [HostComponent, MyComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    componentInstance = fixture.debugElement.query(By.directive(MyComponent)).componentInstance;
    const harnessLoader = TestbedHarnessEnvironment.loader(fixture);
    harness = await harnessLoader.getHarness(MyHarness);
  });

  it('should work', async () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toBe(fixture.componentInstance.content);
    expect(await harness.getText()).toBe(fixture.componentInstance.content);
  });
});

describe('using test-kit', () => {
  describe('hosted template', () => {
    const ctx = TestContextBuilder.forHostedTemplate(MyComponent).buildAndBootstrap();
    it('should', () => {
      expect(ctx.element.textContent).toBe(ctx.host.text);
    });
  });
  describe('component', () => {
    const ctx = TestContextBuilder.forComponent(MyComponent).withHarness(MyHarness).buildAndBootstrap();

    it('should', () => {
      expect(ctx.harness).toBeDefined();
      expect(ctx.element.textContent).toBe(ctx.component.text);
    });
  });
  describe('component with host', () => {
    const ctx = TestContextBuilder.forHostedComponent(HostComponent, MyComponent)
      .withHarness(MyHarness)
      .buildAndBootstrap();

    it('should', () => {
      expect(ctx.harness).toBeDefined();
      expect(ctx.element.textContent).toBe(ctx.host.content);
    });
  });
});
