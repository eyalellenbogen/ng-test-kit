import { Component } from '@angular/core';
import { TestContextBuilder } from 'test-kit/public-api';
import { DropdownComponent } from './dropdown.component';
import { DropdownHarness } from './dropdown.component.harness';

@Component({
  template: ` <lib-dropdown [items]="items" [selection]="selectedItem" (selectionChange)="selectedItemChange($event)"></lib-dropdown> `,
})
class HostComponent {
  items: string[];
  selectedItem: string;
  public selectedItemChange(item) {}
}

describe('DropdownComponent', () => {
  const ctx = TestContextBuilder.create(HostComponent).withComponent(DropdownComponent).withHarness(DropdownHarness).build();

  beforeEach(async () => {
    await ctx.bootstrap();
    ctx.setHostProp({
      items: ['iron man', 'hulk', 'captain america', 'thor', 'black widow', 'hawkeye'],
    });
  });

  it('should create', () => {
    expect(ctx.component).toBeDefined();
  });

  describe('trigger', () => {
    describe('when no item is selected', () => {
      beforeEach(() => {
        ctx.setHostProp({ selectedItem: undefined });
      });

      it('should display "select', async () => {
        const label = await ctx.harness.getTriggerLabel();
        expect(label).toBe('select');
      });
    });

    describe('when an item is selected', () => {
      beforeEach(() => {
        ctx.setHostProp({ selectedItem: ctx.host.items[2] });
      });

      it('should display selection', async () => {
        const label = await ctx.harness.getTriggerLabel();
        expect(label).toBe(ctx.host.selectedItem);
      });
    });

    describe('on click', () => {
      describe('when closed', () => {
        beforeEach(async () => {
          await ctx.harness.toggle();
        });
        it('should open', async () => {
          const el = await ctx.harness.getDropMenuElement();
          expect(el).toBeDefined();
        });
      });
      describe('when open', () => {
        beforeEach(async () => {
          // open programatically
          ctx.component.isOpen = true;
          ctx.detectChanges();

          // close
          await ctx.harness.toggle();
        });
        it('should close', async () => {
          const el = await ctx.harness.getDropMenuElement();
          expect(el).toBeNull();
        });
      });
    });

    describe('menu', () => {
      beforeEach(async () => {
        await ctx.harness.toggle();
        spyOn(ctx.host, 'selectedItemChange');
      });
      describe('when item clicked', () => {
        const item = 2;
        beforeEach(async () => {
          const dropMenu = await ctx.harness.getDropMenuElement();
          const items = await dropMenu.items();
          await items[item].click();
        });
        it('should emit selectionChange', () => {
          const expected = ctx.host.items[item];
          expect(ctx.host.selectedItemChange).toHaveBeenCalledWith(expected);
        });
      });
    });
  });
});
