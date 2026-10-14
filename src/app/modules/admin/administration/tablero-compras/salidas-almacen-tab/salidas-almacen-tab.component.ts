import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { SolicitudSalidaAlmacenService } from '../services/solicitud-salida-almacen.service';
import { SolicitudSalidaAlmacen } from '../models/solicitud-salida-almacen.types';
import { NotaSalidaDialogComponent } from '../nota-salida-dialog/nota-salida-dialog.component';
import { ComparativoSalidaDialogComponent } from '../comparativo-salida-dialog/comparativo-salida-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-salidas-almacen-tab',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule
    ],
    templateUrl: './salidas-almacen-tab.component.html'
})
export class SalidasAlmacenTabComponent implements OnInit, OnDestroy {
    salidas: SolicitudSalidaAlmacen[] = [];
    salidasFiltradas: SolicitudSalidaAlmacen[] = [];
    cargando: boolean = false;

    filtroBusqueda: string = '';
    filtroEstatus: string = '';

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _salidaService: SolicitudSalidaAlmacenService,
        private _dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.cargando = true;
        this._salidaService.salidas$.pipe(
            takeUntil(this._unsubscribeAll)
        ).subscribe(list => {
            this.salidas = list;
            this.aplicarFiltros();
            this.cargando = false;
        });

        this.cargarDatos();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    cargarDatos(): void {
        this.cargando = true;
        this._salidaService.getTodas().subscribe({
            next: () => this.cargando = false,
            error: () => this.cargando = false
        });
    }

    aplicarFiltros(): void {
        const query = (this.filtroBusqueda || '').trim().toLowerCase();
        this.salidasFiltradas = this.salidas.filter(s => {
            const matchesEstatus = !this.filtroEstatus || s.estatus === this.filtroEstatus;
            if (!matchesEstatus) return false;

            if (!query) return true;

            const matchFolio = (s.folio || '').toLowerCase().includes(query);
            const matchProyecto = (s.nombreProyecto || '').toLowerCase().includes(query);
            const matchSolicitante = (s.nombreSolicitante || '').toLowerCase().includes(query);
            const matchNotas = (s.observacionesNotas || '').toLowerCase().includes(query);
            const matchContpaq = (s.folioSalidaContpaq || '').toLowerCase().includes(query);
            const matchDetalle = s.detalles && s.detalles.some(d => 
                (d.descripcion || '').toLowerCase().includes(query) ||
                (d.codigoProducto || '').toLowerCase().includes(query)
            );

            return matchFolio || matchProyecto || matchSolicitante || matchNotas || matchContpaq || matchDetalle;
        });
    }

    abrirNuevaNota(): void {
        const dialogRef = this._dialog.open(NotaSalidaDialogComponent, {
            width: '95vw',
            maxWidth: '1100px',
            disableClose: true
        });

        dialogRef.afterClosed().subscribe(resultado => {
            if (resultado) {
                Swal.fire({
                    icon: 'success',
                    title: 'Nota Guardada',
                    text: `La solicitud de salida ${resultado.folio} ha sido creada correctamente.`,
                    timer: 2500,
                    showConfirmButton: false
                });
            }
        });
    }

    abrirComparativo(salida: SolicitudSalidaAlmacen): void {
        const dialogRef = this._dialog.open(ComparativoSalidaDialogComponent, {
            width: '95vw',
            maxWidth: '1150px',
            data: { id: salida.id },
            disableClose: false
        });

        dialogRef.afterClosed().subscribe(resultado => {
            if (resultado) {
                Swal.fire({
                    icon: 'success',
                    title: 'Surtimiento Actualizado',
                    text: 'El comparativo y surtimiento de almacén se ha guardado exitosamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });
    }

    cancelarSalida(salida: SolicitudSalidaAlmacen): void {
        Swal.fire({
            title: '¿Cancelar esta Solicitud de Salida?',
            text: `El folio ${salida.folio} quedará cancelado en el historial.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'Regresar'
        }).then(res => {
            if (res.isConfirmed) {
                this._salidaService.cancelar(salida.id).subscribe(() => {
                    Swal.fire({
                        icon: 'info',
                        title: 'Cancelada',
                        text: 'La solicitud ha sido marcada como cancelada.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                });
            }
        });
    }

    // Contadores para métricas
    get totalNotas(): number { return this.salidas.length; }
    get pendientesCount(): number { return this.salidas.filter(s => s.estatus === 'Pendiente').length; }
    get parcialesCount(): number { return this.salidas.filter(s => s.estatus === 'Surtido Parcial').length; }
    get completadasCount(): number { return this.salidas.filter(s => s.estatus === 'Surtido Completo').length; }
}
