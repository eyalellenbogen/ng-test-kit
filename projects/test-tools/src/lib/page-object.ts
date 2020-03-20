import { Type } from '@angular/core';

export class PageObject<T extends HTMLElement = HTMLElement> {
  public get innerText() {
    return this.__nativeElement.innerText;
  }

  public get innerHTML() {
    return this.__nativeElement.innerHTML;
  }

  public get classList() {
    return this.__nativeElement.classList;
  }

  public get dispatchEvent() {
    return this.__nativeElement.dispatchEvent.bind(this.__nativeElement);
  }

  public get parent() {
    return this.__nativeElement.parentElement;
  }

  // tslint:disable-next-line:variable-name
  constructor(public __nativeElement: T) {
    if (!__nativeElement) {
      console.warn('PageObject created with an undefined/null HTMLElement. Exepct errors when calling methods or getters.');
    }
  }

  public get host() {
    return this.__nativeElement;
  }

  public get clientRect() {
    return this.__nativeElement.getBoundingClientRect();
  }

  public click() {
    this.__nativeElement.click();
  }

  public focus() {
    this.__nativeElement.focus();
  }

  public blur() {
    this.__nativeElement.blur();
  }

  public getAttribute(attribute: string) {
    return this.__nativeElement.getAttribute(attribute);
  }

  /**
   * Creates new <T extends PageObject> object from given selector
   */
  protected getElement<TElement extends HTMLElement, TPageObject extends PageObject<TElement>>(
    selector: string,
    type?: Type<TPageObject>,
    contents?: (Type<PageObject> | undefined)[],
    container?: HTMLElement
  ): TPageObject | undefined {
    const res = this.getElements(selector, type, contents, container);
    return res.length ? res[0] : undefined;
  }

  /**
   * Creates new <T extends PageObject> array from given selector
   */
  protected getElements<TElement extends HTMLElement, TPageObject extends PageObject<TElement>>(
    selector: string,
    type?: Type<TPageObject>,
    contents?: (Type<PageObject> | undefined)[],
    container?: HTMLElement
  ): TPageObject[] {
    const els = this.getHtmlElements<TElement>(selector, container);

    contents = contents || [];
    return els.map(x => {
      return type ? new type(x, ...contents) : (new PageObject<HTMLElement>(x) as TPageObject);
    });
  }

  private getHtmlElements<TElement extends HTMLElement>(selector: string, container?: HTMLElement) {
    const root = container || this.__nativeElement;
    const nodes = root.querySelectorAll(selector);
    const res: TElement[] = [];
    nodes.forEach(x => {
      res.push(x as TElement);
    });

    return res;
  }
}
