import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { EngineeringService, SeguimientoProyecto } from '../engineering.service';
import { SeguimientoDialogComponent } from './seguimiento-dialog/seguimiento-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-tablero-proyectos',
    templateUrl: './tablero-proyectos.component.html',
    styleUrls: ['./tablero-proyectos.component.scss'],
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
        MatDatepickerModule,
        MatNativeDateModule,
        MatSelectModule,
        MatPaginatorModule
    ]
})
export class TableroProyectosComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = [
        'idSeguimiento',
        'solicitante',
        'celular',
        'empresa',
        'area',
        'actividad',
        'tipo',
        'levantamiento',
        'quienRealizoLevantamiento',
        'cotizacion',
        'quienCotizo',
        'aprobado',
        'oc',
        'monto',
        'acciones'
    ];
    dataSource = new MatTableDataSource<SeguimientoProyecto>();
    showFilters: boolean = true;

    // Advanced Filters
    fechaInicio: any = '';
    fechaFin: any = '';
    filtroSearch: string = '';

    // KPIs
    totalProyectos = 0;
    countLevOk = 0;
    countCotOk = 0;
    countAprobados = 0;
    montoTotal = 0;

    // Listas de estatus y opciones para cambiar rápido
    levantamientoOptions = [
        { id: 1, label: 'Pendiente', color: '#f59e0b' },
        { id: 2, label: 'En Proceso', color: '#3b82f6' },
        { id: 3, label: 'OK', color: '#10b981' },
        { id: 4, label: 'Detenida', color: '#ef4444' }
    ];

    cotizacionOptions = [
        { id: 1, label: 'Pendiente', color: '#f59e0b' },
        { id: 2, label: 'En Proceso', color: '#3b82f6' },
        { id: 3, label: 'OK', color: '#10b981' },
        { id: 4, label: 'Detenida', color: '#ef4444' }
    ];

    aprobacionOptions = [
        { id: 1, label: 'En Espera', color: '#f59e0b' },
        { id: 2, label: 'Aprobado', color: '#10b981' },
        { id: 3, label: 'Rechazado', color: '#ef4444' }
    ];

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    constructor(
        private _engineeringService: EngineeringService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        // Cargar rango de fecha por defecto: primer día del mes corriente hasta hoy
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        this.fechaInicio = firstDay.toISOString().split('T')[0];
        this.fechaFin = now.toISOString().split('T')[0];

        this.getSeguimientos();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this._setupFilterPredicate();
    }

    getSeguimientos(): void {
        // Formatear fechas a YYYY-MM-DD
        const start = this.fechaInicio ? (this.fechaInicio instanceof Date ? this.fechaInicio.toISOString().split('T')[0] : this.fechaInicio) : undefined;
        const end = this.fechaFin ? (this.fechaFin instanceof Date ? this.fechaFin.toISOString().split('T')[0] : this.fechaFin) : undefined;

        this._engineeringService.getSeguimientos(start, end).subscribe({
            next: (data) => {
                this.dataSource.data = data;
                this._calculateKPIs(data);
            },
            error: (err) => {
                console.error(err);
            }
        });
    }

    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }

    applyFilter(event: Event): void {
        this.filtroSearch = (event.target as HTMLInputElement).value;
        this._updateFilter();
    }

    private _setupFilterPredicate(): void {
        this.dataSource.filterPredicate = (data: SeguimientoProyecto, filter: string) => {
            const search = filter.trim().toLowerCase();
            if (!search) return true;

            const solicitante = (data.nombreCompleto || '').toLowerCase();
            const empresa = (data.empresa || '').toLowerCase();
            const area = (data.area || '').toLowerCase();
            const actividad = (data.actividad || '').toLowerCase();
            const tipo = (data.tipo || '').toLowerCase();
            const oc = (data.ordenCompraFolio || '').toLowerCase();
            const realizoLevantamiento = (data.quienRealizoLevantamiento || '').toLowerCase();
            const quienCotizo = (data.quienCotizo || '').toLowerCase();
            const id = String(data.idSeguimiento);

            return solicitante.includes(search) ||
                   empresa.includes(search) ||
                   area.includes(search) ||
                   actividad.includes(search) ||
                   tipo.includes(search) ||
                   oc.includes(search) ||
                   realizoLevantamiento.includes(search) ||
                   quienCotizo.includes(search) ||
                   id.includes(search);
        };
    }

    private _updateFilter(): void {
        this.dataSource.filter = this.filtroSearch;
    }

    private _calculateKPIs(data: SeguimientoProyecto[]): void {
        this.totalProyectos = data.length;
        this.countLevOk = data.filter(d => d.estatusLevantamiento === 3).length;
        this.countCotOk = data.filter(d => d.estatusCotizacion === 3).length;
        this.countAprobados = data.filter(d => d.estatusAprobacion === 2).length;
        this.montoTotal = data.reduce((acc, curr) => acc + (curr.montoTotalEstimado || 0), 0);
    }

    // ==========================================
    // 🎨 COLOR & LABEL HELPERS
    // ==========================================
    getLevantamientoColorClass(id: number): string {
        switch (id) {
            case 1: return 'bg-amber-100 text-amber-700 border-amber-200'; // Pendiente
            case 2: return 'bg-blue-100 text-blue-700 border-blue-200';     // En Proceso
            case 3: return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // OK
            case 4: return 'bg-rose-100 text-rose-700 border-rose-200';     // Detenida
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }

    getLevantamientoName(id: number): string {
        switch (id) {
            case 1: return 'Pendiente';
            case 2: return 'En Proceso';
            case 3: return 'OK';
            case 4: return 'Detenida';
            default: return 'Desconocido';
        }
    }

    getAprobacionColorClass(id: number): string {
        switch (id) {
            case 1: return 'bg-amber-100 text-amber-700 border-amber-200'; // En Espera
            case 2: return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // Aprobado
            case 3: return 'bg-rose-100 text-rose-700 border-rose-200';     // Rechazado
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }

    getAprobacionName(id: number): string {
        switch (id) {
            case 1: return 'En Espera';
            case 2: return 'Aprobado';
            case 3: return 'Rechazado';
            default: return 'Desconocido';
        }
    }

    // ==========================================
    // ✍️ ACTIONS & POPUPS
    // ==========================================
    nuevoSeguimiento(): void {
        const dialogRef = this._dialog.open(SeguimientoDialogComponent, {
            width: '100%',
            maxWidth: '650px',
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this._engineeringService.saveSeguimiento(result).subscribe({
                    next: () => {
                        this.getSeguimientos();
                        Swal.fire({
                            title: '¡Guardado!',
                            text: 'Seguimiento registrado exitosamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo registrar el seguimiento', 'error');
                    }
                });
            }
        });
    }

    editarSeguimiento(row: SeguimientoProyecto): void {
        const dialogRef = this._dialog.open(SeguimientoDialogComponent, {
            width: '100%',
            maxWidth: '650px',
            data: { seguimiento: row },
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this._engineeringService.saveSeguimiento(result).subscribe({
                    next: () => {
                        this.getSeguimientos();
                        Swal.fire({
                            title: '¡Actualizado!',
                            text: 'Seguimiento actualizado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo actualizar el seguimiento', 'error');
                    }
                });
            }
        });
    }

    eliminarSeguimiento(id: number): void {
        Swal.fire({
            title: '¿Eliminar seguimiento?',
            text: 'Esta acción es irreversible y eliminará el registro de seguimiento.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                confirmButton: 'inline-flex items-center justify-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-all mx-2',
                cancelButton: 'inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-lg transition-all mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this._engineeringService.deleteSeguimiento(id).subscribe({
                    next: () => {
                        this.getSeguimientos();
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El seguimiento fue eliminado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo eliminar el seguimiento', 'error');
                    }
                });
            }
        });
    }

    cambiarLevantamiento(id: number, estatus: number): void {
        this._engineeringService.updateEstatusLevantamiento(id, estatus).subscribe({
            next: () => {
                this.getSeguimientos();
                Swal.fire({
                    title: '¡Estatus Actualizado!',
                    text: 'Levantamiento actualizado correctamente',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo actualizar el estatus', 'error');
            }
        });
    }

    cambiarCotizacion(id: number, estatus: number): void {
        this._engineeringService.updateEstatusCotizacion(id, estatus).subscribe({
            next: () => {
                this.getSeguimientos();
                Swal.fire({
                    title: '¡Estatus Actualizado!',
                    text: 'Cotización actualizada correctamente',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo actualizar el estatus', 'error');
            }
        });
    }

    cambiarAprobacion(id: number, estatus: number): void {
        this._engineeringService.updateEstatusAprobacion(id, estatus).subscribe({
            next: () => {
                this.getSeguimientos();
                Swal.fire({
                    title: '¡Estatus Actualizado!',
                    text: 'Aprobación actualizada correctamente',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo actualizar el estatus', 'error');
            }
        });
    }
}
