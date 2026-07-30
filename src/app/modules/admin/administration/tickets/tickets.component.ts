import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `<router-outlet></router-outlet>`
})
export class TicketsComponent { }
