import { Routes } from '@angular/router';
import { OffboardingDetalleComponent } from './offboarding-detalle/offboarding-detalle.component';
import { OffboardingListaComponent } from './offboarding-lista/offboarding-lista.component';

export default [
    { path: '', component: OffboardingListaComponent },
    { path: ':id', component: OffboardingDetalleComponent }
] as Routes;
