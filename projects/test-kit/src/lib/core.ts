import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

export class BaseTestContext<T> {
  constructor(public fixture: ComponentFixture<T>) {}

  public get component() {
    return this.fixture.componentInstance;
  }

  public get element(): HTMLElement {
    return this.fixture.debugElement.nativeElement;
  }

  public detectChanges() {
    this.fixture.detectChanges();
  }
}

export function getTestContext<T>(component: Type<T>) {
  const fixture = TestBed.createComponent<T>(component);
  const testCtx = new BaseTestContext<T>(fixture);
  return testCtx;
}

export async function getStableTestContext<T>(component: Type<T>) {
  const testCtx = getTestContext(component);
  testCtx.detectChanges();
  await testCtx.fixture.whenStable();
  testCtx.detectChanges();
  return testCtx;
}
