import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SolicitudSalidaAlmacenService } from '../services/solicitud-salida-almacen.service';
import { SolicitudSalidaAlmacen, RegistrarEntregaSalidaDto } from '../models/solicitud-salida-almacen.types';

@Component({
    selector: 'app-comparativo-salida-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule
    ],
    templateUrl: './comparativo-salida-dialog.component.html'
})
export class ComparativoSalidaDialogComponent implements OnInit {
    solicitud: SolicitudSalidaAlmacen;
    guardando: boolean = false;

    folioSalidaContpaq: string = '';
    nombreUsuarioEntrega: string = '';

    // Copia editable de partidas para registro de entregas
    partidasEditables: {
        id: number;
        codigoProducto?: string;
        descripcion: string;
        unidadMedida: string;
        cantidadSolicitada: number;
        cantidadEntregada: number;
        esManual: boolean;
        notas?: string;
    }[] = [];

    constructor(
        private _salidaService: SolicitudSalidaAlmacenService,
        public dialogRef: MatDialogRef<ComparativoSalidaDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { id: number }
    ) {}

    ngOnInit(): void {
        this.cargarDetalle();
    }

    cargarDetalle(): void {
        this._salidaService.getPorId(this.data.id).subscribe({
            next: (sol) => {
                this.solicitud = sol;
                this.folioSalidaContpaq = sol.folioSalidaContpaq || '';
                this.nombreUsuarioEntrega = sol.nombreUsuarioEntrega || '';
                this.partidasEditables = sol.detalles.map(d => ({
                    id: d.id,
                    codigoProducto: d.codigoProducto,
                    descripcion: d.descripcion,
                    unidadMedida: d.unidadMedida,
                    cantidadSolicitada: d.cantidadSolicitada,
                    cantidadEntregada: d.cantidadEntregada,
                    esManual: d.esManual,
                    notas: d.notas || ''
                }));
            },
            error: (err) => {
                console.error('Error al cargar detalle de salida', err);
            }
        });
    }

    getEstatusPartida(solicitada: number, entregada: number): { label: string; color: string; bg: string } {
        if (entregada >= solicitada && solicitada > 0) {
            return { label: 'Surtido Completo', color: '#059669', bg: '#ecfdf5' };
        }
        if (entregada > 0) {
            return { label: 'Surtido Parcial', color: '#d97706', bg: '#fffbeb' };
        }
        return { label: 'No Surtido', color: '#dc2626', bg: '#fef2f2' };
    }

    surtirTodo(): void {
        this.partidasEditables.forEach(p => {
            p.cantidadEntregada = p.cantidadSolicitada;
        });
    }

    get porcentajeCalculado(): number {
        if (!this.partidasEditables.length) return 0;
        const totalSol = this.partidasEditables.reduce((acc, p) => acc + p.cantidadSolicitada, 0);
        if (totalSol <= 0) return 0;
        const totalEnt = this.partidasEditables.reduce((acc, p) => acc + (p.cantidadEntregada || 0), 0);
        return Math.min(100, Math.round((totalEnt / totalSol) * 100));
    }

    guardarEntrega(): void {
        this.guardando = true;

        const payload: RegistrarEntregaSalidaDto = {
            fechaEntrega: new Date(),
            folioSalidaContpaq: this.folioSalidaContpaq.trim(),
            nombreUsuarioEntrega: this.nombreUsuarioEntrega.trim(),
            partidas: this.partidasEditables.map(p => ({
                idDetalle: p.id,
                cantidadEntregada: p.cantidadEntregada || 0,
                notas: p.notas
            }))
        };

        this._salidaService.registrarEntrega(this.solicitud.id, payload).subscribe({
            next: (actualizada) => {
                this.guardando = false;
                this.dialogRef.close(actualizada);
            },
            error: (err) => {
                this.guardando = false;
                console.error('Error al registrar entrega', err);
            }
        });
    }

    cerrar(): void {
        this.dialogRef.close();
    }
}
