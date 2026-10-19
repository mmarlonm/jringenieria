import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ExpedienteComponent } from '../expediente/expediente.component';

/** Expediente de un colaborador para RRHH: el mismo componente que usa el colaborador, con validar, rechazar y «no aplica». */
@Component({
    selector: 'rrhh-expedientes-detalle',
    standalone: true,
    imports: [RouterLink, MatButtonModule, MatIconModule, ExpedienteComponent],
    template: `
        <div class="w-full max-w-3xl mx-auto p-4 sm:p-8 flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
                <h1 class="text-2xl font-black tracking-tight m-0">Expediente</h1>
                <a mat-stroked-button [routerLink]="['/rrhh/expedientes']">
                    <mat-icon [svgIcon]="'heroicons_outline:arrow-left'"></mat-icon>
                    <span class="ml-2">Expedientes</span>
                </a>
            </div>
            <rrhh-expediente [colaboradorId]="id()" />
        </div>
    `
})
export class ExpedientesDetalleComponent {
    readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => Number(p.get('id')))), { initialValue: 0 });
}
