import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CapacitacionService } from '../capacitacion.service';
import {
    CapacitacionDetalle,
    CapacitacionParticipante,
    SEMAFOROS_VENCIMIENTO
} from '../capacitacion.types';
import { DialogoCapacitacionComponent } from '../dialogos/dialogo-capacitacion.component';
import { DialogoEficaciaComponent } from '../dialogos/dialogo-eficacia.component';
import { DialogoEstatusCapacitacionComponent } from '../dialogos/dialogo-estatus-capacitacion.component';
import { DialogoParticipanteComponent } from '../dialogos/dialogo-participante.component';

@Component({
    selector: 'app-capacitacion-detalle',
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
    templateUrl: './capacitacion-detalle.component.html'
})
export class CapacitacionDetalleComponent implements OnInit {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _service = inject(CapacitacionService);
    private readonly _dialog = inject(MatDialog);

    capacitacionId!: number;
    capacitacion: CapacitacionDetalle | null = null;
    cargando = true;

    semaforoConfig = SEMAFOROS_VENCIMIENTO;

    ngOnInit(): void {
        const idParam = this._route.snapshot.paramMap.get('id');
        if (!idParam) {
            this._router.navigate(['/rrhh/capacitacion']);
            return;
        }
        this.capacitacionId = Number(idParam);
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this._service.obtener(this.capacitacionId).subscribe({
            next: (data) => {
                this.capacitacion = data;
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
                this._router.navigate(['/rrhh/capacitacion']);
            }
        });
    }

    editarCurso(): void {
        if (!this.capacitacion) return;
        const ref = this._dialog.open(DialogoCapacitacionComponent, {
            data: { capacitacion: this.capacitacion },
            width: '800px'
        });
        ref.afterClosed().subscribe((res) => {
            if (res) {
                this.cargar();
            }
        });
    }

    cambiarEstatus(): void {
        if (!this.capacitacion) return;
        const ref = this._dialog.open(DialogoEstatusCapacitacionComponent, {
            data: { capacitacion: this.capacitacion },
            width: '520px'
        });
        ref.afterClosed().subscribe((res) => {
            if (res) {
                this.cargar();
            }
        });
    }

    evaluarEficacia(): void {
        if (!this.capacitacion) return;
        const ref = this._dialog.open(DialogoEficaciaComponent, {
            data: { capacitacion: this.capacitacion },
            width: '560px'
        });
        ref.afterClosed().subscribe((res) => {
            if (res) {
                this.cargar();
            }
        });
    }

    agregarParticipante(): void {
        if (!this.capacitacion) return;
        const ref = this._dialog.open(DialogoParticipanteComponent, {
            data: { capacitacionId: this.capacitacion.capacitacionId },
            width: '560px'
        });
        ref.afterClosed().subscribe((res) => {
            if (res) {
                this.cargar();
            }
        });
    }

    editarParticipante(p: CapacitacionParticipante): void {
        if (!this.capacitacion) return;
        const ref = this._dialog.open(DialogoParticipanteComponent, {
            data: { capacitacionId: this.capacitacion.capacitacionId, participante: p },
            width: '560px'
        });
        ref.afterClosed().subscribe((res) => {
            if (res) {
                this.cargar();
            }
        });
    }

    eliminarParticipante(p: CapacitacionParticipante): void {
        if (!confirm(`¿Eliminar al participante "${p.colaboradorNombre}"?`)) return;
        this._service.eliminarParticipante(p.participanteId).subscribe({
            next: () => {
                this.cargar();
            },
            error: (err) => {
                alert(err?.error?.mensaje || 'Error al eliminar el participante');
            }
        });
    }

    obtenerClaseSemaforo(semaforo?: string): string {
        if (!semaforo) return 'bg-gray-100 text-gray-800';
        return (this.semaforoConfig as any)[semaforo]?.class || 'bg-gray-100 text-gray-800';
    }

    obtenerLabelSemaforo(semaforo?: string): string {
        if (!semaforo) return '';
        return (this.semaforoConfig as any)[semaforo]?.label || semaforo;
    }
}
