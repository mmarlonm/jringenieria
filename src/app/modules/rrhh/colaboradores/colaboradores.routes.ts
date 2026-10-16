import { Routes } from '@angular/router';
import { ColaboradorFichaComponent } from './colaborador-ficha/colaborador-ficha.component';
import { ColaboradoresListaComponent } from './colaboradores-lista/colaboradores-lista.component';

export default [
    { path: '', component: ColaboradoresListaComponent },
    { path: 'nuevo', component: ColaboradorFichaComponent },
    { path: ':id', component: ColaboradorFichaComponent }
] as Routes;
