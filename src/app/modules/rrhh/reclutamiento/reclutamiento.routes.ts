import { Routes } from '@angular/router';
import { ReclutamientoListaComponent } from './reclutamiento-lista/reclutamiento-lista.component';
import { RequisicionDetalleComponent } from './requisicion-detalle/requisicion-detalle.component';

export default [
    { path: '', component: ReclutamientoListaComponent },
    { path: ':id', component: RequisicionDetalleComponent }
] as Routes;

