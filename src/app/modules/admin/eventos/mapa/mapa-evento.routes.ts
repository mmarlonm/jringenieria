import { Route } from '@angular/router';

export const MAPA_EVENTO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./mapa-evento.component').then(m => m.MapaEventoComponent),
  },
];
