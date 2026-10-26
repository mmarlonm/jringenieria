import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import '../../finanzas.locale';
import { ClaseSugerida, MovimientoConciliacion } from '../../finanzas.types';
import {
    clasesDeConfianza,
    etiquetaClase,
    etiquetaEstadoMovimiento,
    etiquetaRegla,
    referenciaCfdi
} from '../../finanzas.utils';

@Component({
    selector: 'app-finanzas-movimiento-tarjeta',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatCheckboxModule, MatIconModule],
    templateUrl: './movimiento-tarjeta.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovimientoTarjetaComponent {
    @Input({ required: true }) movimiento!: MovimientoConciliacion;
    @Input({ required: true }) moneda!: string;
    @Input() puedeEscribir = false;
    @Input() ocupados: ReadonlySet<number> = new Set();
    @Input() ocupado = false;
    @Input() claseSugerida: ClaseSugerida | null = null;
    @Input() seleccionado = false;

    @Output() confirmar = new EventEmitter<number>();
    @Output() rechazar = new EventEmitter<number>();
    @Output() deshacer = new EventEmitter<number>();
    @Output() aplicarManual = new EventEmitter<void>();
    @Output() aceptarClase = new EventEmitter<void>();
    @Output() quitarClase = new EventEmitter<void>();
    @Output() seleccion = new EventEmitter<boolean>();

    readonly etiquetaEstado = etiquetaEstadoMovimiento;
    readonly etiquetaClase = etiquetaClase;
    readonly etiquetaRegla = etiquetaRegla;
    readonly clasesConfianza = clasesDeConfianza;
    readonly refCfdi = referenciaCfdi;

    mostrarPendiente(): boolean {
        return ['SinConciliar', 'ConSugerencia', 'Parcial'].includes(this.movimiento?.estado);
    }
}
