import { Routes } from '@angular/router';
import { ActaDetalleComponent } from './acta-detalle/acta-detalle.component';
import { ActasListaComponent } from './actas-lista/actas-lista.component';

export default [
    { path: '', component: ActasListaComponent },
    { path: ':id', component: ActaDetalleComponent }
] as Routes;
