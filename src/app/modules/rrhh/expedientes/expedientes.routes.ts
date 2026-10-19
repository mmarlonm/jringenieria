import { Routes } from '@angular/router';
import { ExpedientesDetalleComponent } from './expedientes-detalle.component';
import { ExpedientesListaComponent } from './expedientes-lista.component';

export default [
    { path: '', component: ExpedientesListaComponent },
    { path: ':id', component: ExpedientesDetalleComponent }
] as Routes;
