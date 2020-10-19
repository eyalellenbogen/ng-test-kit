import { Component, Input, EventEmitter, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'lib-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownComponent {
  @Input()
  public items: string[];

  @Input()
  public selection: string;

  @Output()
  public selectionChange = new EventEmitter<string>();

  public isOpen: boolean;

  constructor(private cdr: ChangeDetectorRef) {}

  public select(item: string) {
    this.selectionChange.emit(item);
  }

  public toggle() {
    this.isOpen = !this.isOpen;
    this.cdr.detectChanges();
  }
}
