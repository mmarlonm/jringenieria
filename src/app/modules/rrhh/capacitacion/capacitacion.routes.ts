import { Routes } from '@angular/router';
import { CapacitacionDetalleComponent } from './capacitacion-detalle/capacitacion-detalle.component';
import { CapacitacionListaComponent } from './capacitacion-lista/capacitacion-lista.component';

export default [
    { path: '', component: CapacitacionListaComponent },
    { path: ':id', component: CapacitacionDetalleComponent }
] as Routes;
