import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
    PedidosService
} from '../pedidos.service';
import {
    PedidoResumen,
    PedidoKpis,
    PedidoCatalogos,
    PedidoFiltros,
    ImportePorMoneda
} from '../pedidos.types';

@Component({
    selector: 'app-pedidos-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        MatTableModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatTabsModule,
        MatTooltipModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './pedidos-list.component.html',
    styleUrls: ['./pedidos-list.component.scss']
})
export class PedidosListComponent implements OnInit {
    cargando = false;
    cargandoKpis = false;
    items: PedidoResumen[] = [];
    total = 0;
    kpis: PedidoKpis | null = null;
    catalogos: PedidoCatalogos | null = null;

    columnasMostradas: string[] = [
        'folio',
        'estatus',
        'clienteNombre',
        'cotizacionFolio',
        'sucursalNombre',
        'montoPedido',
        'responsableNombre',
        'fechaRegistro',
        'alertas',
        'acciones'
    ];

    filtros: PedidoFiltros = {
        desde: '',
        hasta: '',
        unidadId: undefined,
        estatus: undefined,
        responsableId: undefined,
        texto: '',
        page: 1,
        size: 25
    };

    constructor(
        private readonly _pedidosService: PedidosService,
        private readonly _router: Router,
        private readonly _cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.inicializarFechasMes();
        this.cargarCatalogos();
        this.cargarDatos();
    }

    inicializarFechasMes(): void {
        const now = new Date();
        const anio = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const ultimoDia = new Date(anio, now.getMonth() + 1, 0).getDate();
        this.filtros.desde = `${anio}-${mes}-01`;
        this.filtros.hasta = `${anio}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
    }

    cargarCatalogos(): void {
        this._pedidosService.obtenerCatalogos().subscribe({
            next: (cat) => {
                this.catalogos = cat;
                this._cdr.markForCheck();
            },
            error: () => {}
        });
    }

    cargarDatos(): void {
        this.cargarPedidos();
        this.cargarKpis();
    }

    cargarPedidos(): void {
        this.cargando = true;
        this._pedidosService.listar(this.filtros).subscribe({
            next: (res) => {
                this.items = res.items || [];
                this.total = res.total || 0;
                this.cargando = false;
                this._cdr.markForCheck();
            },
            error: () => {
                this.cargando = false;
                this._cdr.markForCheck();
            }
        });
    }

    cargarKpis(): void {
        this.cargandoKpis = true;
        this._pedidosService
            .obtenerKpis({
                desde: this.filtros.desde,
                hasta: this.filtros.hasta,
                unidadId: this.filtros.unidadId,
                responsableId: this.filtros.responsableId
            })
            .subscribe({
                next: (kpis) => {
                    this.kpis = kpis;
                    this.cargandoKpis = false;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.cargandoKpis = false;
                    this._cdr.markForCheck();
                }
            });
    }

    aplicarFiltros(): void {
        this.filtros.page = 1;
        this.cargarDatos();
    }

    limpiarFiltros(): void {
        this.inicializarFechasMes();
        this.filtros.unidadId = undefined;
        this.filtros.estatus = undefined;
        this.filtros.responsableId = undefined;
        this.filtros.texto = '';
        this.filtros.page = 1;
        this.cargarDatos();
    }

    cambiarPagina(event: PageEvent): void {
        this.filtros.page = event.pageIndex + 1;
        this.filtros.size = event.pageSize;
        this.cargarPedidos();
    }

    verDetalle(pedido: PedidoResumen): void {
        this._router.navigate(['/crm/pedidos', pedido.id]);
    }

    exportarExcel(): void {
        this._pedidosService.exportarExcel(this.items, this.kpis);
    }

    formatearImportes(importes: ImportePorMoneda[] | undefined): string {
        if (!importes || importes.length === 0) return '$0.00';
        return importes
            .map((i) => `${i.moneda}: $${(i.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            .join(' | ');
    }

    obtenerClaseEstatus(estatus: string): string {
        switch (estatus) {
            case 'Recibido':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'EnValidacion':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
            case 'Validado':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'Liberado':
                return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
            case 'EnEjecucion':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
            case 'Entregado':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
            case 'Cerrado':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'Cancelado':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    }
}
