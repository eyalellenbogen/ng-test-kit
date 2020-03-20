import { PageObject } from 'test-tools/public-api';

export class DropdownPageObject extends PageObject {
  get trigger() {
    return this.getElement('.dropdown__trigger');
  }
  get dropMenu() {
    return this.getElement('.dropdown__menu', DropdownMenu);
  }
}

class DropdownMenu extends PageObject {
  get items() {
    return this.getElements('.dropdown__menu-item');
  }
}
