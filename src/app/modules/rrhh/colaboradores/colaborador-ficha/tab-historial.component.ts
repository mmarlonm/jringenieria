import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { ColaboradoresService } from '../colaboradores.service';
import { BitacoraItem } from '../colaboradores.types';
import { mensajeError } from '../colaboradores.utils';

/** Bitácora de cambios del expediente. Los campos sensibles aparecen como «***» (no se guarda el valor). */
@Component({
    selector: 'rrhh-tab-historial',
    standalone: true,
    templateUrl: './tab-historial.component.html',
    imports: [CommonModule, MatTableModule]
})
export class TabHistorialComponent implements OnChanges {
    private readonly _service = inject(ColaboradoresService);

    @Input({ required: true }) colaboradorId!: number;
    /** Cambia después de cada guardado en la ficha, para volver a consultar. */
    @Input() version = 0;

    readonly columnas = ['fecha', 'usuario', 'campo', 'anterior', 'nuevo'];
    items: BitacoraItem[] = [];
    cargando = true;
    error: string | null = null;

    ngOnChanges(): void {
        this.cargando = true;
        this._service.historial(this.colaboradorId).subscribe({
            next: (items) => {
                this.items = items;
                this.error = null;
                this.cargando = false;
            },
            error: (e) => {
                this.cargando = false;
                this.error = mensajeError(e, 'No se pudo cargar el historial.');
            }
        });
    }
}
