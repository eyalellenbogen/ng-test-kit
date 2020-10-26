import { waitForAsync } from '@angular/core/testing';

import { InitComponent } from './init.component';
import { TestContextBuilder } from 'test-kit/public-api';
import { Component } from '@angular/core';
import { DataService } from './data.service';

@Component({
  template: ` <lib-init></lib-init> `,
})
class HostComponent {}

const dataMock = {
  doWork: () => {
    return Promise.reject() as Promise<void>;
  },
};

describe('InitCompComponent', async () => {
  const ctx = TestContextBuilder.create(HostComponent)
    .withComponent(InitComponent)
    .withMetadata({
      declarations: [HostComponent, InitComponent],
      providers: [{ provide: DataService, useValue: dataMock }],
    })
    .build();

  beforeEach(async () => {
    await ctx.bootstrapStable();
  });

  it('should create', () => {
    expect(ctx.component).toBeTruthy();
  });
  describe('when service resolves', () => {
    beforeEach(
      waitForAsync(async () => {
        spyOn(dataMock, 'doWork').and.callFake(() => {
          return Promise.resolve();
        });
        await ctx.bootstrapStable();
      })
    );
    it('should show content', () => {
      expect(ctx.element.querySelector('p')).toBeTruthy();
    });
  });
});
