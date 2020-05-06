import { NgModule } from '@angular/core';
import { DropdownComponent } from './dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { InitComponent } from './init-comp/init.component';

@NgModule({
  imports: [CommonModule],
  declarations: [DropdownComponent, InitComponent]
})
export class ExamplesModule {}
