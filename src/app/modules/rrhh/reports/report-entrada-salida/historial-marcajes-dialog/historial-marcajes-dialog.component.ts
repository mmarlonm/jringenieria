import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AsistenciaReporteDto, MarcajeAsistenciaDto } from '../../../personal-management/personal-management.service';

/**
 * Diálogo para visualizar el historial completo de entradas y salidas de un colaborador en un día específico.
 */
@Component({
    selector: 'rrhh-historial-marcajes-dialog',
    standalone: true,
    templateUrl: './historial-marcajes-dialog.component.html',
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule]
})
export class HistorialMarcajesDialogComponent {
    readonly asistencia = inject<AsistenciaReporteDto>(MAT_DIALOG_DATA);
    readonly marcajes: MarcajeAsistenciaDto[] = this.asistencia?.marcajes ?? [];

    /** Devuelve la hora en formato HH:mm a partir de un valor "HH:mm:ss". */
    hora(valor: string): string {
        return valor ? valor.substring(0, 5) : '';
    }

    /**
     * Calcula el tiempo transcurrido fuera entre una salida previa y la entrada en la posición `i`.
     * Retorna una cadena breve («1 h 15 min», «40 min», «2 h») o `null` si no aplica.
     */
    fuera(i: number): string | null {
        if (i <= 0 || i >= this.marcajes.length) {
            return null;
        }

        const actual = this.marcajes[i];
        const previo = this.marcajes[i - 1];

        if (actual.tipo !== 'ENTRADA' || previo.tipo !== 'SALIDA') {
            return null;
        }

        const minActual = this._minutos(actual.hora);
        const minPrevio = this._minutos(previo.hora);

        if (minActual === null || minPrevio === null) {
            return null;
        }

        let diff = minActual - minPrevio;
        if (diff < 0) {
            diff += 24 * 60; // Cruce de medianoche
        }

        const horas = Math.floor(diff / 60);
        const minutos = diff % 60;

        if (horas > 0 && minutos > 0) {
            return `${horas} h ${minutos} min`;
        }
        if (horas > 0) {
            return `${horas} h`;
        }
        return `${minutos} min`;
    }

    private _minutos(hora: string): number | null {
        if (!hora) return null;
        const partes = hora.split(':');
        if (partes.length < 2) return null;
        const h = parseInt(partes[0], 10);
        const m = parseInt(partes[1], 10);
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
    }
}
