import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { CotizacionEtapasService } from '../cotizacion-etapas.service';
import { CotizacionEtapasListItemDto, ESTATUS_ETAPA } from '../cotizacion-etapas.models';
import { EtapaConfig, obtenerEtapaConfig } from '../etapas.config';
import { NuevoCasoDialogComponent } from '../nuevo-caso-dialog/nuevo-caso-dialog.component';
import { EtapaDetalleDialogComponent } from '../etapa-detalle-dialog/etapa-detalle-dialog.component';

@Component({
    selector: 'app-etapa-lista',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatTooltipModule,
        MatChipsModule
    ],
    templateUrl: './etapa-lista.component.html',
    styleUrls: ['./etapa-lista.component.scss']
})
export class EtapaListaComponent implements OnInit, OnDestroy {
    etapaNumero: number = 1;
    etapaConfig?: EtapaConfig;
    incluirProcesados: boolean = false;
    cargando: boolean = false;
    filtroTexto: string = '';
    casosCompletos: CotizacionEtapasListItemDto[] = [];

    kpiTotal: number = 0;
    kpiPendiente: number = 0;
    kpiEnProceso: number = 0;
    kpiAutorizadaInterna: number = 0;
    kpiAutorizada: number = 0;
    kpiRechazada: number = 0;
    kpiNoAplica: number = 0;
    kpiCancelados: number = 0;

    filtroEstatusKpi: string | null = null;

    columnasDefinidas: string[] = [
        'idSeguimiento',
        'solicitante',
        'titulo',
        'tipo',
        'responsable',
        'estatus',
        'revision',
        'monto',
        'acciones'
    ];

    columnasVisibles: string[] = [];
    dataSource = new MatTableDataSource<CotizacionEtapasListItemDto>([]);

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    private readonly _unsubscribeAll = new Subject<void>();

    constructor(
        private readonly _route: ActivatedRoute,
        private readonly _service: CotizacionEtapasService,
        private readonly _dialog: MatDialog
    ) {}

    ngOnInit(): void {
        const routeDataEtapa = this._route.snapshot.data['etapa'];
        this.etapaNumero = Number(routeDataEtapa) || 1;
        this.etapaConfig = obtenerEtapaConfig(this.etapaNumero);

        this._configurarColumnas();
        this._configurarFiltroPersonalizado();
        this.cargarCasos();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    private _configurarColumnas(): void {
        if (this.etapaConfig?.usaMonto) {
            this.columnasVisibles = [...this.columnasDefinidas];
        } else {
            this.columnasVisibles = this.columnasDefinidas.filter((c) => c !== 'monto');
        }
    }

    private _configurarFiltroPersonalizado(): void {
        this.dataSource.filterPredicate = (data: CotizacionEtapasListItemDto, filter: string) => {
            const query = filter.toLowerCase().trim();
            return (
                (data.idSeguimiento?.toString() || '').includes(query) ||
                (data.solicitanteNombre || '').toLowerCase().includes(query) ||
                (data.empresa || '').toLowerCase().includes(query) ||
                (data.titulo || '').toLowerCase().includes(query) ||
                (data.responsableNombre || '').toLowerCase().includes(query) ||
                (data.tipo || '').toLowerCase().includes(query)
            );
        };
    }

    cargarCasos(): void {
        this.cargando = true;
        this._service.listar(this.etapaNumero, this.incluirProcesados)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (items) => {
                    this.cargando = false;
                    this.casosCompletos = items || [];
                    this._actualizarKpis();
                    this._aplicarFiltroATabla();
                    if (this.paginator) {
                        this.dataSource.paginator = this.paginator;
                    }
                    if (this.sort) {
                        this.dataSource.sort = this.sort;
                    }
                },
                error: (err) => {
                    this.cargando = false;
                    console.error('Error al cargar casos de la etapa', err);
                }
            });
    }

    private _actualizarKpis(): void {
        this.kpiTotal = this.casosCompletos.length;
        this.kpiPendiente = this.casosCompletos.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.Pendiente).length;
        this.kpiEnProceso = this.casosCompletos.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.EnProceso).length;
        this.kpiAutorizadaInterna = this.casosCompletos.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.AutorizadaInterna).length;
        this.kpiAutorizada = this.casosCompletos.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.Autorizada).length;
        this.kpiRechazada = this.casosCompletos.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.Rechazada).length;
        this.kpiNoAplica = this.casosCompletos.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.NoAplica).length;
        this.kpiCancelados = this.casosCompletos.filter(c => c.cancelado).length;
    }

    seleccionarFiltroKpi(clave: string): void {
        if (clave === 'TOTAL' || this.filtroEstatusKpi === clave) {
            this.filtroEstatusKpi = null;
        } else {
            this.filtroEstatusKpi = clave;
        }
        this._aplicarFiltroATabla();
    }

    private _aplicarFiltroATabla(): void {
        let filtrados = this.casosCompletos;

        if (this.filtroEstatusKpi) {
            switch (this.filtroEstatusKpi) {
                case 'PENDIENTE':
                    filtrados = filtrados.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.Pendiente);
                    break;
                case 'EN_PROCESO':
                    filtrados = filtrados.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.EnProceso);
                    break;
                case 'AUTORIZADA_INTERNA':
                    filtrados = filtrados.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.AutorizadaInterna);
                    break;
                case 'AUTORIZADA':
                    filtrados = filtrados.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.Autorizada);
                    break;
                case 'RECHAZADA':
                    filtrados = filtrados.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.Rechazada);
                    break;
                case 'NO_APLICA':
                    filtrados = filtrados.filter(c => !c.cancelado && c.estatusEtapa === ESTATUS_ETAPA.NoAplica);
                    break;
                case 'CANCELADOS':
                    filtrados = filtrados.filter(c => c.cancelado);
                    break;
            }
        }

        this.dataSource.data = filtrados;
        if (this.filtroTexto) {
            this.dataSource.filter = this.filtroTexto.trim().toLowerCase();
        } else {
            this.dataSource.filter = '';
        }

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    cambiarIncluirProcesados(): void {
        this.cargarCasos();
    }

    aplicarFiltro(valor: string): void {
        this.filtroTexto = valor;
        this._aplicarFiltroATabla();
    }

    // Un doble clic (o un clic que sube del icono a la fila) apilaba dos diálogos iguales: solo uno a la vez.
    private _nuevoCasoAbierto = false;
    private _detalleAbierto = false;

    abrirNuevoCaso(): void {
        if (this._nuevoCasoAbierto) return;
        this._nuevoCasoAbierto = true;

        const ref = this._dialog.open(NuevoCasoDialogComponent, {
            width: '800px',
            maxWidth: '95vw',
            disableClose: true
        });

        ref.afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((creado) => {
                this._nuevoCasoAbierto = false;
                if (creado) {
                    this.cargarCasos();
                    this.abrirDetalle(creado.idSeguimiento);
                }
            });
    }

    abrirDetalle(idSeguimiento: number): void {
        if (this._detalleAbierto) return;
        this._detalleAbierto = true;

        const ref = this._dialog.open(EtapaDetalleDialogComponent, {
            width: '1100px',
            maxWidth: '96vw',
            data: {
                idSeguimiento,
                etapa: this.etapaNumero
            },
            disableClose: false
        });

        ref.afterClosed()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((modificado) => {
                this._detalleAbierto = false;
                if (modificado) {
                    this.cargarCasos();
                }
            });
    }

    getEstatusBadge(estatus: number): { texto: string; clases: string } {
        switch (estatus) {
            case ESTATUS_ETAPA.Pendiente:
                return {
                    texto: 'Pendiente',
                    clases: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                };
            case ESTATUS_ETAPA.EnProceso:
                return {
                    texto: 'En Proceso',
                    clases: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                };
            case ESTATUS_ETAPA.Autorizada:
                return {
                    texto: 'Autorizada',
                    clases: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                };
            case ESTATUS_ETAPA.Rechazada:
                return {
                    texto: 'Rechazada',
                    clases: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                };
            case ESTATUS_ETAPA.NoAplica:
                return {
                    texto: 'No Aplica',
                    clases: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                };
            case ESTATUS_ETAPA.AutorizadaInterna:
                return {
                    texto: 'Pendiente del cliente',
                    clases: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                };
            default:
                return { texto: 'Desconocido', clases: 'bg-gray-100 text-gray-700' };
        }
    }
}
