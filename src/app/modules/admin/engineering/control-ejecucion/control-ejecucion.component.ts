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
import { EngineeringService, SeguimientoEjecucion } from '../engineering.service';
import { ControlEjecucionDialogComponent } from './control-ejecucion-dialog/control-ejecucion-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-control-ejecucion',
    templateUrl: './control-ejecucion.component.html',
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
        MatPaginatorModule
    ]
})
export class ControlEjecucionComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = [
        'idSeguimiento',
        'proyecto',
        'utilidadEsperada',
        'fechas',
        'recursos',
        'riesgoPrioridad',
        'ast',
        'gantt',
        'imss',
        'adquisicion',
        'construccion',
        'reporte',
        'acciones'
    ];
    
    dataSource = new MatTableDataSource<SeguimientoEjecucion>();
    showFilters: boolean = true;
    fechaInicio: any = '';
    fechaFin: any = '';
    filtroSearch: string = '';

    // Listas de estatus
    astOptions = [
        { id: 1, label: 'N/A', color: '#94a3b8' },
        { id: 2, label: 'Pendiente', color: '#f59e0b' },
        { id: 3, label: 'En Corrección', color: '#f97316' },
        { id: 4, label: 'En Proceso', color: '#3b82f6' },
        { id: 5, label: 'Por Aprobación', color: '#8b5cf6' },
        { id: 6, label: 'Enviado y Aprobado', color: '#10b981' }
    ];

    ganttOptions = [
        { id: 1, label: 'N/A', color: '#94a3b8' },
        { id: 2, label: 'Pendiente', color: '#f59e0b' },
        { id: 3, label: 'En Corrección', color: '#f97316' },
        { id: 4, label: 'En Proceso', color: '#3b82f6' },
        { id: 5, label: 'Por Aprobación', color: '#8b5cf6' }
    ];

    imssOptions = [
        { id: 1, label: 'N/A', color: '#94a3b8' },
        { id: 2, label: 'Pendiente', color: '#f59e0b' },
        { id: 3, label: 'En Corrección', color: '#f97316' },
        { id: 4, label: 'En Proceso', color: '#3b82f6' },
        { id: 5, label: 'Por Aprobación', color: '#8b5cf6' },
        { id: 6, label: 'Enviado y Aprobado', color: '#10b981' }
    ];

    adquisicionOptions = [
        { id: 1, label: 'Aprobados', color: '#10b981' },
        { id: 2, label: 'En Aprobación', color: '#8b5cf6' },
        { id: 3, label: 'En Proceso de Compra', color: '#3b82f6' },
        { id: 4, label: 'Adquiridos', color: '#059669' },
        { id: 5, label: 'En Proceso de Llegada', color: '#0ea5e9' },
        { id: 6, label: 'En Paquetería', color: '#f59e0b' }
    ];

    construccionOptions = [
        { id: 1, label: 'Finalizada y Entregada', color: '#10b981' },
        { id: 2, label: 'Detenida', color: '#ef4444' },
        { id: 3, label: 'En Proceso', color: '#3b82f6' },
        { id: 4, label: 'Finalizada por Entregar', color: '#8b5cf6' }
    ];

    reporteOptions = [
        { id: 1, label: 'N/A', color: '#94a3b8' },
        { id: 2, label: 'Pendiente', color: '#f59e0b' },
        { id: 3, label: 'En Corrección', color: '#f97316' },
        { id: 4, label: 'En Proceso', color: '#3b82f6' },
        { id: 5, label: 'En Revisión', color: '#8b5cf6' },
        { id: 6, label: 'Entregado', color: '#10b981' }
    ];

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    constructor(
        private _engineeringService: EngineeringService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
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
        const start = this.fechaInicio ? (this.fechaInicio instanceof Date ? this.fechaInicio.toISOString().split('T')[0] : this.fechaInicio) : undefined;
        const end = this.fechaFin ? (this.fechaFin instanceof Date ? this.fechaFin.toISOString().split('T')[0] : this.fechaFin) : undefined;

        this._engineeringService.getSeguimientosEjecucion(start, end).subscribe({
            next: (data) => {
                this.dataSource.data = data;
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
        this.dataSource.filter = this.filtroSearch;
    }

    private _setupFilterPredicate(): void {
        this.dataSource.filterPredicate = (data: SeguimientoEjecucion, filter: string) => {
            const search = filter.trim().toLowerCase();
            if (!search) return true;

            const solicitante = (data.nombreSolicitante || '').toLowerCase();
            const empresa = (data.empresa || '').toLowerCase();
            const actividad = (data.actividad || '').toLowerCase();
            const id = String(data.idSeguimiento);

            return solicitante.includes(search) ||
                   empresa.includes(search) ||
                   actividad.includes(search) ||
                   id.includes(search);
        };
    }

    // ==========================================
    // HELPERS
    // ==========================================
    getEstatusColorClass(estatus: number, list: any[]): string {
        const item = list.find(x => x.id === estatus);
        if(!item) return 'bg-slate-100 text-slate-700 border-slate-200';
        
        switch (item.color) {
            case '#94a3b8': return 'bg-slate-100 text-slate-700 border-slate-200';
            case '#f59e0b': return 'bg-amber-100 text-amber-700 border-amber-200';
            case '#f97316': return 'bg-orange-100 text-orange-700 border-orange-200';
            case '#3b82f6': return 'bg-blue-100 text-blue-700 border-blue-200';
            case '#8b5cf6': return 'bg-purple-100 text-purple-700 border-purple-200';
            case '#10b981': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case '#059669': return 'bg-green-100 text-green-700 border-green-200';
            case '#0ea5e9': return 'bg-sky-100 text-sky-700 border-sky-200';
            case '#ef4444': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }

    getEstatusName(estatus: number, list: any[]): string {
        const item = list.find(x => x.id === estatus);
        return item ? item.label : 'N/A';
    }

    // ==========================================
    // ACTIONS
    // ==========================================
    editarEjecucion(row: SeguimientoEjecucion): void {
        const dialogRef = this._dialog.open(ControlEjecucionDialogComponent, {
            width: '100%',
            maxWidth: '1000px',
            data: { ejecucion: row },
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this._engineeringService.saveSeguimientoEjecucion(result).subscribe({
                    next: () => {
                        this.getSeguimientos();
                        Swal.fire({
                            title: '¡Actualizado!',
                            text: 'Información de ejecución guardada',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo guardar la información', 'error');
                    }
                });
            }
        });
    }

    cambiarEstatus(id: number, campo: string, estatus: number): void {
        this._engineeringService.updateEstatusEjecucionRapido(id, campo, estatus).subscribe({
            next: () => {
                this.getSeguimientos();
                Swal.fire({
                    title: '¡Estatus Actualizado!',
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
