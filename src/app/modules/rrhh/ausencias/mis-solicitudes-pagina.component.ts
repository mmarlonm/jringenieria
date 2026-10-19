import { Component } from '@angular/core';
import { MisSolicitudesComponent } from './mis-solicitudes.component';

@Component({
    selector: 'rrhh-mis-solicitudes-pagina',
    standalone: true,
    imports: [MisSolicitudesComponent],
    template: `
        <div class="w-full max-w-3xl mx-auto p-4 sm:p-8 flex flex-col gap-4">
            <div>
                <h1 class="text-2xl font-black tracking-tight m-0">Mis vacaciones y permisos</h1>
                <p class="text-secondary text-sm italic">Consulta tu saldo de vacaciones y tramita tus permisos laborales.</p>
            </div>
            <rrhh-mis-solicitudes />
        </div>
    `
})
export class MisSolicitudesPaginaComponent {}
