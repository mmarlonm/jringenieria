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
import { DialogoRequisicionComponent } from '../dialogos/dialogo-requisicion.component';
import { ReclutamientoService } from '../reclutamiento.service';
import { RequisicionResumen } from '../reclutamiento.types';

@Component({
    selector: 'app-reclutamiento-lista',
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
    templateUrl: './reclutamiento-lista.component.html'
})
export class ReclutamientoListaComponent implements OnInit {
    private readonly _service = inject(ReclutamientoService);
    private readonly _dialog = inject(MatDialog);
    private readonly _router = inject(Router);

    requisiciones: RequisicionResumen[] = [];
    cargando = false;
    filtroEstatus = '';
    buscarTexto = '';

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando = true;
        this._service.listarRequisiciones({
            estatus: this.filtroEstatus || undefined,
            buscar: this.buscarTexto.trim() || undefined
        }).subscribe({
            next: (data) => {
                this.requisiciones = data;
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
            }
        });
    }

    nuevaRequisicion(): void {
        const ref = this._dialog.open(DialogoRequisicionComponent, {
            data: {}
        });
        ref.afterClosed().subscribe((res) => {
            if (res) {
                this._router.navigate(['/rrhh/reclutamiento', res.requisicionId]);
            }
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
}

