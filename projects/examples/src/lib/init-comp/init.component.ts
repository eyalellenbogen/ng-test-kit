import { Component, OnInit } from '@angular/core';
import { DataService } from './data.service';

let loadCounter = 1;
@Component({
  selector: 'lib-init',
  templateUrl: './init.component.html',
  styleUrls: ['./init.component.scss'],
})
export class InitComponent implements OnInit {
  public show: boolean;
  public rnd = loadCounter++;
  constructor(private dataService: DataService) {}
  ngOnInit(): void {
    this.dataService.doWork().then(
      () => {
        this.show = true;
      },
      (err) => {}
    );
  }
}
