import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { CapacitacionService } from '../capacitacion.service';
import {
    CapacitacionResumen,
    ESTATUS_CAPACITACION,
    configSemaforo
} from '../capacitacion.types';
import { DialogoCapacitacionComponent } from '../dialogos/dialogo-capacitacion.component';
import { DialogoEstatusCapacitacionComponent } from '../dialogos/dialogo-estatus-capacitacion.component';

@Component({
    selector: 'app-capacitacion-lista',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDialogModule,
        MatMenuModule,
        MatTooltipModule
    ],
    templateUrl: './capacitacion-lista.component.html'
})
export class CapacitacionListaComponent implements OnInit {
    private readonly _service = inject(CapacitacionService);
    private readonly _dialog = inject(MatDialog);
    private readonly _router = inject(Router);

    capacitaciones: CapacitacionResumen[] = [];
    cargando = false;

    filtroEstatus = '';
    filtroSemaforo = '';
    buscarTexto = '';

    estatuses = ESTATUS_CAPACITACION;

    // Métricas calculadas
    totalHoras = 0;
    totalVencidasOAlerta = 0;
    totalEficaces = 0;

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this._service.listar({
            estatus: this.filtroEstatus || undefined,
            semaforo: this.filtroSemaforo || undefined,
            buscar: this.buscarTexto.trim() || undefined
        }).subscribe({
            next: (data) => {
                this.capacitaciones = data;
                this.calcularMetricas(data);
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
            }
        });
    }

    private calcularMetricas(data: CapacitacionResumen[]): void {
        this.totalHoras = data.reduce((acc, c) => acc + (c.duracionHoras || 0), 0);
        this.totalVencidasOAlerta = data.filter(c => c.semaforoVencimiento === 'Rojo' || c.semaforoVencimiento === 'Amarillo').length;
        this.totalEficaces = data.filter(c => c.resultadoEficacia === 'Eficaz').length;
    }

    nuevaCapacitacion(): void {
        const ref = this._dialog.open(DialogoCapacitacionComponent, {
            data: {},
            width: '800px'
        });
        ref.afterClosed().subscribe((res) => {
            if (res) {
                this.cargar();
                this._router.navigate(['/rrhh/capacitacion', res.capacitacionId]);
            }
        });
    }

    editarCapacitacion(c: CapacitacionResumen): void {
        const ref = this._dialog.open(DialogoCapacitacionComponent, {
            data: { capacitacion: c },
            width: '800px'
        });
        ref.afterClosed().subscribe((res) => {
            if (res) {
                this.cargar();
            }
        });
    }

    cambiarEstatus(c: CapacitacionResumen): void {
        this._service.obtener(c.capacitacionId).subscribe({
            next: (detalle) => {
                const ref = this._dialog.open(DialogoEstatusCapacitacionComponent, {
                    data: { capacitacion: detalle },
                    width: '520px'
                });
                ref.afterClosed().subscribe((res) => {
                    if (res) {
                        this.cargar();
                    }
                });
            }
        });
    }

    obtenerClaseSemaforo(semaforo: string): string {
        return configSemaforo(semaforo)?.class || 'bg-gray-100 text-gray-800';
    }

    obtenerLabelSemaforo(semaforo: string): string {
        return configSemaforo(semaforo)?.label || semaforo;
    }
}
