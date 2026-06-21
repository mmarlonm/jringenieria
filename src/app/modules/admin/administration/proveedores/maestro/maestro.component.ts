import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProveedoresService } from '../proveedores.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-maestro',
    templateUrl: './maestro.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatPaginatorModule,
        MatSortModule,
        MatTableModule,
        MatTooltipModule,
        MatCardModule,
        MatDividerModule,
        MatProgressBarModule
    ]
})
export class MaestroComponent implements OnInit {
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    dataSource: MatTableDataSource<any> = new MatTableDataSource([]);
    displayedColumns: string[] = [
        'idProveedor',
        'razonSocial',
        'rfc',
        'categoria',
        'tiempoEntregaPromedio',
        'calificacionVigente',
        'estatusProveedor',
        'acciones'
    ];

    // Data lists
    proveedores: any[] = [];
    selectedProveedor: any = null;
    isLoading: boolean = false;
    isSyncing: boolean = false;

    // Filters
    searchQuery: string = '';
    filterCategoria: string = 'TODAS';
    filterBand: string = 'TODAS';
    filterEstatus: string = 'TODOS';

    // Summary statistics
    stats = {
        total: 0,
        activos: 0,
        promedioCalificacion: 0,
        recomendados: 0 // A rating
    };

    categoriasList: string[] = [];

    constructor(private _proveedoresService: ProveedoresService) {}

    ngOnInit(): void {
        this.cargarProveedores();
    }

    cargarProveedores(): void {
        this.isLoading = true;
        this._proveedoresService.getProveedoresMaestro().subscribe({
            next: (res) => {
                this.proveedores = res.data || [];
                this.categoriasList = Array.from(new Set(this.proveedores.map(p => p.categoria).filter(Boolean)));
                this.aplicarFiltros();
                this.calcularEstadisticas();
                this.isLoading = false;
            },
            error: (err) => {
                this.isLoading = false;
                Swal.fire('Error', 'No se pudo cargar el catálogo maestro de proveedores.', 'error');
            }
        });
    }

    calcularEstadisticas(): void {
        const total = this.proveedores.length;
        const activos = this.proveedores.filter(p => p.estatusProveedor === 'Activo').length;
        const sum = this.proveedores.reduce((acc, p) => acc + (p.calificacionVigente || 0), 0);
        const promedio = total > 0 ? sum / total : 0;
        const recomendados = this.proveedores.filter(p => p.calificacionVigente >= 90).length;

        this.stats = {
            total,
            activos,
            promedioCalificacion: Math.round(promedio * 100) / 100,
            recomendados
        };
    }

    aplicarFiltros(): void {
        let filtered = [...this.proveedores];

        // Search text (Reason social, RFC, Categoria)
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                (p.razonSocial?.toLowerCase().includes(query)) ||
                (p.rfc?.toLowerCase().includes(query)) ||
                (p.categoria?.toLowerCase().includes(query)) ||
                (p.nombreComercial?.toLowerCase().includes(query))
            );
        }

        // Categoria filter
        if (this.filterCategoria !== 'TODAS') {
            filtered = filtered.filter(p => p.categoria === this.filterCategoria);
        }

        // Estatus filter
        if (this.filterEstatus !== 'TODOS') {
            filtered = filtered.filter(p => p.estatusProveedor === this.filterEstatus);
        }

        // Band filter
        if (this.filterBand !== 'TODAS') {
            filtered = filtered.filter(p => {
                const score = p.calificacionVigente || 0;
                if (this.filterBand === 'A') return score >= 90;
                if (this.filterBand === 'B') return score >= 80 && score < 90;
                if (this.filterBand === 'C') return score >= 70 && score < 80;
                if (this.filterBand === 'D') return score < 70;
                return true;
            });
        }

        this.dataSource.data = filtered;
        setTimeout(() => {
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
        });
    }

    seleccionarProveedor(row: any): void {
        this.selectedProveedor = row;
    }

    getBand(score: number): { name: string, color: string, text: string } {
        if (score >= 90) return { name: 'A', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Recomendado' };
        if (score >= 80) return { name: 'B', color: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Monitoreo' };
        if (score >= 70) return { name: 'C', color: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Condicionado' };
        return { name: 'D', color: 'bg-rose-50 text-rose-700 border-rose-200', text: 'No Recomendado' };
    }

    recalcular(id: number): void {
        Swal.fire({
            title: 'Recalculando...',
            text: 'Obteniendo historial de entregas y actualizando calificación.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this._proveedoresService.recalcularCalificacion(id).subscribe({
            next: (res) => {
                Swal.fire('Éxito', res.message || 'Calificación actualizada con éxito.', 'success');
                this.cargarProveedores();
                if (this.selectedProveedor && this.selectedProveedor.idProveedor === id) {
                    this.selectedProveedor.calificacionVigente = res.calificacion;
                }
            },
            error: (err) => {
                Swal.fire('Error', 'No se pudo realizar el recálculo.', 'error');
            }
        });
    }

    cambiarEstatus(prov: any): void {
        const nuevoEstatus = prov.estatusProveedor === 'Activo' ? 'Inactivo' : 'Activo';
        const msg = `¿Desea cambiar el estatus del proveedor a ${nuevoEstatus}?`;

        Swal.fire({
            title: 'Confirmar cambio',
            text: msg,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cambiar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const payload = { ...prov, estatusProveedor: nuevoEstatus };
                this._proveedoresService.saveProveedorMaestro(payload).subscribe({
                    next: () => {
                        Swal.fire('Estatus Actualizado', `El proveedor ahora está ${nuevoEstatus}.`, 'success');
                        this.cargarProveedores();
                        if (this.selectedProveedor && this.selectedProveedor.idProveedor === prov.idProveedor) {
                            this.selectedProveedor.estatusProveedor = nuevoEstatus;
                        }
                    },
                    error: () => {
                        Swal.fire('Error', 'No se pudo actualizar el estatus.', 'error');
                    }
                });
            }
        });
    }

    sincronizarContpaqi(): void {
        Swal.fire({
            title: '¿Sincronizar proveedores?',
            text: 'Se importarán los proveedores de CONTPAQi. Aquellos que ya existan se actualizarán sin perder los datos editados en el CRM.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, sincronizar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.isSyncing = true;
                Swal.fire({
                    title: 'Sincronizando...',
                    text: 'Obteniendo datos de CONTPAQi y procesando en el CRM.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this._proveedoresService.sincronizarProveedores().subscribe({
                    next: (res) => {
                        this.isSyncing = false;
                        Swal.fire('Éxito', res.message || 'Sincronización completada con éxito.', 'success');
                        this.cargarProveedores();
                    },
                    error: (err) => {
                        this.isSyncing = false;
                        const errorMsg = err.error?.message || 'Ocurrió un error al sincronizar con CONTPAQi.';
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    }
}
