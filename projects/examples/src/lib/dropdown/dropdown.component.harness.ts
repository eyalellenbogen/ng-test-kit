import { ComponentHarness } from '@angular/cdk/testing';

export class DropdownHarness extends ComponentHarness {
  static hostSelector = 'lib-dropdown';

  protected getTriggerElement = this.locatorFor('.dropdown__trigger');
  public getDropMenuElement = this.locatorForOptional(DropdownMenuHarness);

  public async getTriggerLabel() {
    const el = await this.getTriggerElement();
    return el.text();
  }

  public async toggle() {
    const trigger = await this.getTriggerElement();
    await trigger.click();
    this.forceStabilize();
  }
}

class DropdownMenuHarness extends ComponentHarness {
  static hostSelector = '.dropdown__menu';
  public items = this.locatorForAll('.dropdown__menu-item');
}
