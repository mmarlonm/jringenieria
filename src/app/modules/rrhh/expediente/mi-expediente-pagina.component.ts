import { Component } from '@angular/core';
import { ExpedienteComponent } from './expediente.component';

/** «Mi expediente» en el menú: el mismo componente que usa el perfil, sin colaborador (usa al de la sesión). */
@Component({
    selector: 'rrhh-mi-expediente-pagina',
    standalone: true,
    imports: [ExpedienteComponent],
    template: `
        <div class="w-full max-w-3xl mx-auto p-4 sm:p-8 flex flex-col gap-4">
            <div>
                <h1 class="text-2xl font-black tracking-tight m-0">Mi expediente</h1>
                <p class="text-secondary text-sm italic">Sube tus documentos de ingreso; RRHH los revisa y valida.</p>
            </div>
            <rrhh-expediente />
        </div>
    `
})
export class MiExpedientePaginaComponent {}
