import { PageObject } from './page-object';
import { Type } from '@angular/core';

export class InputPageObject extends PageObject<HTMLInputElement> {}

export class LabelPageObject extends PageObject<HTMLLabelElement> {}

export class AnchorPageObject extends PageObject<HTMLAnchorElement> {}

export class TemplatedPageObject<TContent extends PageObject = PageObject> extends PageObject {
  constructor(nativeElement: HTMLElement, private readonly contentType?: Type<TContent>) {
    super(nativeElement);
  }
  get content() {
    return this.getElement(':scope > *:first-child', this.contentType);
  }
}
