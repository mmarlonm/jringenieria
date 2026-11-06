import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatIaService } from 'app/core/services/chat-ia.service';
import { DialogoCandidatoFichaComponent } from '../dialogos/dialogo-candidato-ficha.component';
import { DialogoCandidatoComponent } from '../dialogos/dialogo-candidato.component';
import { DialogoDescarteComponent } from '../dialogos/dialogo-descarte.component';
import { DialogoEntrevistaComponent } from '../dialogos/dialogo-entrevista.component';
import { DialogoEvaluacionComponent } from '../dialogos/dialogo-evaluacion.component';
import { DialogoRequisicionComponent } from '../dialogos/dialogo-requisicion.component';
import { ReclutamientoService } from '../reclutamiento.service';
import { construirContextoChat, FiltroSugerenciaIa, filtrarPorSugerenciaIa, UMBRAL_SUGERENCIA_IA } from '../reclutamiento-ia.utils';
import { Candidato, RequisicionDetalle } from '../reclutamiento.types';

@Component({
    selector: 'app-requisicion-detalle',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatMenuModule,
        MatTooltipModule
    ],
    templateUrl: './requisicion-detalle.component.html'
})
export class RequisicionDetalleComponent implements OnInit, OnDestroy {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _service = inject(ReclutamientoService);
    private readonly _dialog = inject(MatDialog);
    private readonly _chat = inject(ChatIaService);

    requisicionId!: number;
    requisicion: RequisicionDetalle | null = null;
    cargando = false;
    analizandoElegibles = false;
    filtroIa: FiltroSugerenciaIa = 'todos';
    readonly umbralSugerenciaIa = UMBRAL_SUGERENCIA_IA;

    ngOnInit(): void {
        this.requisicionId = Number(this._route.snapshot.paramMap.get('id'));
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this._service.obtenerRequisicion(this.requisicionId).subscribe({
            next: (data) => {
                this.requisicion = data;
                this.cargando = false;
                // El chat de IA (Rayito) conoce esta vacante; solo recibe candidatos con consentimiento de IA
                this._chat.setContext(`Reclutamiento: ${data.folio} - ${data.puesto}`, construirContextoChat(data));
            },
            error: (err) => {
                this.cargando = false;
                alert(err?.error?.mensaje || 'Error al cargar la vacante');
                this._router.navigate(['/rrhh/reclutamiento']);
            }
        });
    }

    ngOnDestroy(): void {
        this._chat.clearContext();
    }

    /** Candidatos que se muestran según el filtro de sugerencia de IA (el orden del ranking no cambia). */
    get candidatosVisibles(): Candidato[] {
        return this.requisicion ? filtrarPorSugerenciaIa(this.requisicion.candidatos, this.filtroIa) : [];
    }

    posicionRanking(c: Candidato): number {
        return (this.requisicion?.candidatos.indexOf(c) ?? -1) + 1;
    }

    abrirEditarRequisicion(): void {
        if (!this.requisicion) return;
        const ref = this._dialog.open(DialogoRequisicionComponent, {
            data: { requisicion: this.requisicion }
        });
        ref.afterClosed().subscribe((res) => {
            if (res) this.cargar();
        });
    }

    alternarAprobacion(tipo: 'AdminGeneral' | 'Direccion' | 'Rrhh', actual: boolean): void {
        this._service.cambiarAprobacion(this.requisicionId, tipo, !actual).subscribe({
            next: () => this.cargar(),
            error: (err) => alert(err?.error?.mensaje || 'Error al actualizar la aprobación')
        });
    }

    publicar(): void {
        this._service.publicarRequisicion(this.requisicionId).subscribe({
            next: () => this.cargar(),
            error: (err) => alert(err?.error?.mensaje || 'Error al publicar la vacante')
        });
    }

    cancelar(): void {
        const motivo = prompt('Indica el motivo de cancelación de esta requisición:');
        if (!motivo || !motivo.trim()) return;

        this._service.cancelarRequisicion(this.requisicionId, motivo.trim()).subscribe({
            next: () => this.cargar(),
            error: (err) => alert(err?.error?.mensaje || 'Error al cancelar la requisición')
        });
    }

    analizarElegiblesIa(): void {
        if (!this.requisicion) return;
        this.analizandoElegibles = true;
        this._service.analizarRequisicionIa(this.requisicionId).subscribe({
            next: (res) => {
                this.analizandoElegibles = false;
                let mensaje = `Análisis de preselección con IA completado.\n\n` +
                    `• Analizados exitosamente: ${res.totalAnalizados}\n` +
                    `• Candidatos omitidos: ${res.totalOmitidos}`;
                if (res.omitidos && res.omitidos.length > 0) {
                    mensaje += '\n\nDetalle de omisiones:\n' +
                        res.omitidos.map((o) => `• ${o.nombre}: ${o.motivo}`).join('\n');
                }
                alert(mensaje);
                this.cargar();
            },
            error: (err) => {
                this.analizandoElegibles = false;
                alert(err?.error?.mensaje || 'Error al ejecutar el análisis de preselección con IA');
            }
        });
    }

    abrirNuevoCandidato(): void {
        const ref = this._dialog.open(DialogoCandidatoComponent, {
            data: { requisicionId: this.requisicionId }
        });
        ref.afterClosed().subscribe((res) => {
            if (res) this.cargar();
        });
    }

    abrirFichaCandidato(c: Candidato): void {
        const ref = this._dialog.open(DialogoCandidatoFichaComponent, {
            data: { candidatoId: c.candidatoId }
        });
        ref.afterClosed().subscribe(() => this.cargar());
    }

    abrirEntrevista(c: Candidato, event: Event): void {
        event.stopPropagation();
        const ref = this._dialog.open(DialogoEntrevistaComponent, {
            data: { candidatoId: c.candidatoId, candidatoNombre: c.nombre }
        });
        ref.afterClosed().subscribe((res) => {
            if (res) this.cargar();
        });
    }

    abrirEvaluacion(c: Candidato, tipo: 'Psicometrica' | 'Practica', event: Event): void {
        event.stopPropagation();
        const ref = this._dialog.open(DialogoEvaluacionComponent, {
            data: { candidatoId: c.candidatoId, candidatoNombre: c.nombre, tipoInicial: tipo }
        });
        ref.afterClosed().subscribe((res) => {
            if (res) this.cargar();
        });
    }

    abrirDescarte(c: Candidato, event: Event): void {
        event.stopPropagation();
        const ref = this._dialog.open(DialogoDescarteComponent, {
            data: { candidatoId: c.candidatoId, nombre: c.nombre }
        });
        ref.afterClosed().subscribe((res) => {
            if (res) this.cargar();
        });
    }

    estatusClase(estatus: string): string {
        switch (estatus) {
            case 'Borrador': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
            case 'EnAprobacion': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            case 'Aprobada': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Publicada': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'Cubierta': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'Cancelada': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    candidatoEstatusClase(estatus: string): string {
        switch (estatus) {
            case 'Nuevo': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Contactado': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
            case 'EnEntrevistas': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            case 'Evaluado': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'Seleccionado': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'Descartado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    }
}

