import { Routes } from '@angular/router';
import { CierreTerminalListComponent } from './list/cierre-terminal-list.component';
import { CierreTerminalDetailComponent } from './detail/cierre-terminal-detail.component';

export default [
    {
        path: '',
        component: CierreTerminalListComponent
    }
] as Routes;
