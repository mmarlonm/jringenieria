import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SolicitudCompraService } from '../solicitudes-compra/solicitud-compra.service';
import { SolicitudCompra, CatEstatusCompra } from '../solicitudes-compra/models/solicitud-compra.types';
import { SolicitudDetalleDialogComponent } from './solicitud-detalle-dialog/solicitud-detalle-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'tablero-compras',
    templateUrl: './tablero-compras.component.html',
    styleUrls: ['./tablero-compras.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatSortModule,
        MatTableModule,
        MatTooltipModule,
        MatDialogModule,
        SolicitudDetalleDialogComponent,
        RouterLink
    ]
})
export class TableroComprasComponent implements OnInit, OnDestroy
{
    displayedColumns: string[] = [
        'fechaRequerida',
        'lugarEntrega',
        'moneda',
        'monto',
        'tipoCompra',
        'centroCosto',
        'comentarios',
        'estatus',
        'pendiente',
        'acciones'
    ];
    dataSource: MatTableDataSource<SolicitudCompra> = new MatTableDataSource();
    estatus: CatEstatusCompra[] = [];

    // KPIs
    totalSolicitudes: number = 0;
    countCreada: number = 0;      // ID 1
    countRevision: number = 0;    // ID 2
    countCotizacion: number = 0;  // ID 3
    countAprobacion: number = 0;  // ID 4
    countOC: number = 0;          // ID 5
    countTransito: number = 0;    // ID 6
    countRecibido: number = 0;    // ID 7
    countCerrada: number = 0;     // ID 8

    selectedStatusId: number | null = null;

    @ViewChild(MatSort) sort: MatSort;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _solicitudCompraService: SolicitudCompraService,
        private _dialog: MatDialog
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void
    {
        // Get estatus
        this._solicitudCompraService.estatus$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((estatus) => {
                this.estatus = estatus;
            });

        // Get solicitudes
        this._solicitudCompraService.solicitudes$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((solicitudes) => {
                this.dataSource.data = solicitudes;
                this.dataSource.sort = this.sort;
                this._calculateKPIs();
            });

        // Load initial data
        this._solicitudCompraService.getEstatus().subscribe();
        this._solicitudCompraService.getTodas().subscribe();
    }

    ngOnDestroy(): void
    {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    verDetalle(idSolicitud: number): void
    {
        this._dialog.open(SolicitudDetalleDialogComponent, {
            data: { idSolicitud },
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            autoFocus: false
        });
    }

    cambiarEstatus(id: number, idEstatus: number): void
    {
        const estatusNuevo = this.estatus.find(e => e.idEstatus === idEstatus);

        Swal.fire({
            title: '¿Cambiar estatus?',
            text: `¿Estás seguro de cambiar el estatus a "${estatusNuevo?.nombreEstatus || 'Nuevo'}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                this._solicitudCompraService.actualizarEstatus(id, idEstatus)
                    .subscribe({
                        next: () => {
                            Swal.fire({
                                title: '¡Éxito!',
                                text: 'Estatus actualizado correctamente',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            });
                            this._solicitudCompraService.getTodas().subscribe();
                        },
                        error: () => {
                            Swal.fire('Error', 'No se pudo actualizar el estatus', 'error');
                        }
                    });
            }
        });
    }

    applyFilter(event: Event): void
    {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
        
        // Reset process filter when using search
        if (filterValue) {
            this.selectedStatusId = null;
        }
    }

    filterByStatus(statusId: number | null): void
    {
        if (this.selectedStatusId === statusId) {
            this.selectedStatusId = null;
        } else {
            this.selectedStatusId = statusId;
        }

        if (this.selectedStatusId === null) {
            this.dataSource.filter = '';
        } else {
            // Using a custom filter predicate or just filtering the data source
            // Simple way: Filter by status name or ID
            const statusName = this.getStatusName(this.selectedStatusId).toLowerCase();
            this.dataSource.filter = statusName;
        }
    }

    getStatusName(estatusId: number): string
    {
        const estatus = this.estatus.find(e => e.idEstatus === estatusId);
        return estatus ? estatus.nombreEstatus : 'Sin Estatus';
    }

    getColorByEstatusId(estatusId: number): string
    {
        const nombre = this.getStatusName(estatusId).toLowerCase();

        // Specific colors for the 8 statuses
        if (estatusId === 1 || nombre.includes('creada')) return '#FB275D'; // Pink
        if (estatusId === 2 || nombre.includes('revision') || nombre.includes('revisión') || nombre.includes('reivision')) return '#FFCB00'; // Yellow
        if (estatusId === 3 || nombre.includes('cotizacion') || nombre.includes('cotización')) return '#F59E0B'; // Orange
        if (estatusId === 4 || nombre.includes('aprobacion') || nombre.includes('aprobación')) return '#A855F7'; // Purple
        if (estatusId === 5 || nombre.includes('orden')) return '#6366F1'; // Indigo
        if (estatusId === 6 || nombre.includes('transito') || nombre.includes('tránsito')) return '#3B82F6'; // Blue
        if (estatusId === 7 || nombre.includes('recibido')) return '#22C55E'; // Green
        if (estatusId === 8 || nombre.includes('cerrada')) return '#15803D'; // Dark Green
        
        return '#C4C4C4';
    }

    getFillColorByEstatusId(estatusId: number): string
    {
        const color = this.getColorByEstatusId(estatusId);
        return color + '15';
    }

    getPendienteTotal(s: SolicitudCompra): number
    {
        if (!s.detalles) return 0;
        return s.detalles.reduce((acc, current) => acc + (current.pendiente || 0), 0);
    }

    getMontoTotal(s: SolicitudCompra): number
    {
        return 0;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    private _calculateKPIs(): void
    {
        const solicitudes = this.dataSource.data;
        this.totalSolicitudes = solicitudes.length;
        
        this.countCreada = solicitudes.filter(s => s.idEstatus === 1 || s.nombreEstatus.toLowerCase().includes('creada')).length;
        this.countRevision = solicitudes.filter(s => s.idEstatus === 2 || s.nombreEstatus.toLowerCase().includes('revision') || s.nombreEstatus.toLowerCase().includes('revisión')).length;
        this.countCotizacion = solicitudes.filter(s => s.idEstatus === 3 || s.nombreEstatus.toLowerCase().includes('cotización') || s.nombreEstatus.toLowerCase().includes('cotizacion')).length;
        this.countAprobacion = solicitudes.filter(s => s.idEstatus === 4 || s.nombreEstatus.toLowerCase().includes('aprobación') || s.nombreEstatus.toLowerCase().includes('aprobacion')).length;
        this.countOC = solicitudes.filter(s => s.idEstatus === 5 || s.nombreEstatus.toLowerCase().includes('orden')).length;
        this.countTransito = solicitudes.filter(s => s.idEstatus === 6 || s.nombreEstatus.toLowerCase().includes('transito') || s.nombreEstatus.toLowerCase().includes('tránsito')).length;
        this.countRecibido = solicitudes.filter(s => s.idEstatus === 7 || s.nombreEstatus.toLowerCase().includes('recibido')).length;
        this.countCerrada = solicitudes.filter(s => s.idEstatus === 8 || s.nombreEstatus.toLowerCase().includes('cerrada')).length;
    }
}
