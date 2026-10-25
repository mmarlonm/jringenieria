import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RechazoFila, ResultadoImportacion } from '../../finanzas.types';
import { hayAdvertencias, textoResumen } from '../../finanzas.utils';

// shortcut: la tabla de rechazos muestra solo las primeras filas (un archivo equivocado puede traer miles); paginarla si hace falta ver todas.
const MAX_RECHAZOS_VISIBLES = 200;

/**
 * Cuerpo del resultado de una importación (CFDI o banco): resumen, advertencias y filas rechazadas.
 * El título y los avisos propios de cada página van fuera; lo que se proyecte aparece antes del resumen.
 */
@Component({
    selector: 'app-finanzas-resultado-importacion',
    standalone: true,
    templateUrl: './resultado-importacion.component.html',
    host: { class: 'block space-y-5' },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultadoImportacionComponent {
    @Input({ required: true }) resultado!: ResultadoImportacion;

    readonly textoResumen = textoResumen;
    readonly hayAdvertencias = hayAdvertencias;
    readonly maxRechazosVisibles = MAX_RECHAZOS_VISIBLES;

    get rechazosVisibles(): RechazoFila[] {
        return this.resultado.rechazados.slice(0, MAX_RECHAZOS_VISIBLES);
    }
}
