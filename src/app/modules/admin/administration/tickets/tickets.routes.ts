import { Routes } from '@angular/router';
import { TicketsComponent } from './tickets.component';
import { TicketsListComponent } from './list/tickets-list.component';
import { TicketsFormComponent } from './form/tickets-form.component';
import { TicketsDetailComponent } from './detail/tickets-detail.component';

export const ticketsRoutes: Routes = [
  {
    path: '',
    component: TicketsComponent,
    children: [
      {
        path: '',
        component: TicketsListComponent
      },
      {
        path: 'nuevo',
        component: TicketsFormComponent
      },
      {
        path: ':id',
        component: TicketsDetailComponent
      }
    ]
  }
];
