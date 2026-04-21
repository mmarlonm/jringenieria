import { Component, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';
import { SolicitudCompraService } from '../solicitudes-compra/solicitud-compra.service';
import { SolicitudCompra, CatEstatusCompra } from '../solicitudes-compra/models/solicitud-compra.types';
import { SolicitudDetalleDialogComponent } from '../tablero-compras/solicitud-detalle-dialog/solicitud-detalle-dialog.component';
import { HistorialDialogComponent } from '../tablero-compras/historial-dialog/historial-dialog.component';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { ExchangeRateService } from 'app/core/services/exchange-rate.service';

@Component({
    selector: 'historico-compras',
    templateUrl: './historico-compras.component.html',
    styleUrls: ['./historico-compras.component.scss'],
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
        HistorialDialogComponent,
        RouterLink,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSelectModule
    ]
})
export class HistoricoComprasComponent implements OnInit, OnDestroy
{
    displayedColumns: string[] = [
        'folio',
        'folioOC',
        'fechaSolicitud',
        'sucursal',
        'areaSolicitante',
        'solicitante',
        'proyectoCliente',
        'folioProyecto',
        'prioridad',
        'proveedorSugerido',
        'banco',
        'cuenta',
        'clabe',
        'datosBancarios',
        'fechaRequerida',
        'lugarEntrega',
        'moneda',
        'monto',
        'montoMXN',
        'tipoCompra',
        'centroCosto',
        'comentarios',
        'cuadranteId',
        'estatus',
        'acciones'
    ];
    dataSource: MatTableDataSource<SolicitudCompra> = new MatTableDataSource();
    estatus: CatEstatusCompra[] = [];

    // KPIs
    totalSolicitudes: number = 0;
    totalsByCurrency: { [key: string]: number } = {};
    avgCost: number = 0;
    efficiencyRate: number = 0;

    countCreada: number = 0;
    countRevision: number = 0;
    countCotizacion: number = 0;
    countAprobacion: number = 0;
    countOC: number = 0;
    countTransito: number = 0;
    countRecibido: number = 0;
    countCerrada: number = 0;

    usuarios: any[] = [];
    selectedStatusId: number | null = null;
    fechaInicio: any = '';
    fechaFin: any = '';
    filtroSearch: string = '';
    filtroPrioridad: string = '';

    prioridadesList = ['Urgente', 'Alta', 'Normal'];
    cuadrantesList = [
        { id: 1, nombre: 'Urgente / Importante' },
        { id: 2, nombre: 'No Urgente / Importante' },
        { id: 3, nombre: 'Urgente / No Importante' },
        { id: 4, nombre: 'No Urgente / No Importante' }
    ];

    @ViewChild(MatSort) sort: MatSort;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _solicitudCompraService: SolicitudCompraService,
        private _usersService: UsersService,
        public _exchangeRateService: ExchangeRateService,
        private _dialog: MatDialog,
        private _changeDetectorRef: ChangeDetectorRef
    ) {}

    ngOnInit(): void
    {
        this._solicitudCompraService.estatus$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((estatus) => {
                this.estatus = estatus;
                this._changeDetectorRef.markForCheck();
            });

        this._solicitudCompraService.solicitudes$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((solicitudes) => {
                this.dataSource.data = solicitudes || [];
                this.dataSource.sort = this.sort;
                this._setupFilterPredicate();
                this._updateFilter();
            });

        this._usersService.getUsers()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((users) => {
                this.usuarios = users || [];
                this._changeDetectorRef.markForCheck();
            });

        this._solicitudCompraService.getEstatus().subscribe();
        
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        this.fechaInicio = firstDay.toISOString().split('T')[0];
        this.fechaFin = now.toISOString().split('T')[0];

        this._solicitudCompraService.getTodas(this.fechaInicio, this.fechaFin).subscribe();
    }

    ngOnDestroy(): void
    {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

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

    getUserLabel(idUsuario: number): string
    {
        if (!this.usuarios || this.usuarios.length === 0) return `ID: ${idUsuario}`;
        const user = this.usuarios.find(u => u.id === idUsuario || u.usuarioId === idUsuario);
        return user ? (user.nombreUsuario || user.nombre || user.email) : `ID: ${idUsuario}`;
    }

    verHistorial(idSolicitud: number): void {
        this._dialog.open(HistorialDialogComponent, {
            data: { idSolicitud },
            width: '100%',
            maxWidth: '600px',
            autoFocus: false
        });
    }

    applyFilter(event: Event): void
    {
        this.filtroSearch = (event.target as HTMLInputElement).value;
        this._updateFilter();
    }

    private _setupFilterPredicate(): void {
        this.dataSource.filterPredicate = (data: SolicitudCompra, filter: string) => {
            try {
                const filterObj = JSON.parse(filter);
                const searchStr = (filterObj.search || '').toLowerCase();
                const dataStr = `${data.idSolicitud} ${data.folioOC || ''} ${data.sucursal} ${data.areaSolicitante} ${data.proyectoCliente || ''} ${data.centroCosto} ${data.nombreEstatus} ${data.banco || ''} ${data.cuenta || ''} ${data.clabe || ''}`.toLowerCase();
                
                const passSearch = dataStr.includes(searchStr);
                const passStatus = filterObj.statusId ? data.idEstatus === filterObj.statusId : true;
                const passPriority = filterObj.prioridad ? data.prioridad === filterObj.prioridad : true;

                return passSearch && passStatus && passPriority;
            } catch (e) {
                return true;
            }
        };
    }

    private _updateFilter(): void {
        const filterObj = {
            search: this.filtroSearch,
            statusId: this.selectedStatusId,
            prioridad: this.filtroPrioridad
        };
        this.dataSource.filter = JSON.stringify(filterObj);
        this._calculateKPIs();
        this._changeDetectorRef.markForCheck();
    }

    onFilterChange(): void {
        this._updateFilter();
    }

    loadByDateRange(): void {
        if (!this.fechaInicio || !this.fechaFin) return;
        const start = this.fechaInicio instanceof Date ? this.fechaInicio.toISOString().split('T')[0] : this.fechaInicio;
        const end = this.fechaFin instanceof Date ? this.fechaFin.toISOString().split('T')[0] : this.fechaFin;
        this._solicitudCompraService.getTodas(start, end).subscribe();
    }

    filterByStatus(statusId: number | null): void
    {
        this.selectedStatusId = (this.selectedStatusId === statusId) ? null : statusId;
        this._updateFilter();
    }

    getStatusName(estatusId: number): string
    {
        const estatus = this.estatus.find(e => e.idEstatus === estatusId);
        return estatus ? estatus.nombreEstatus : 'Sin Estatus';
    }

    getColorByEstatusId(estatusId: number): string
    {
        const nombre = this.getStatusName(estatusId).toLowerCase();
        if (estatusId === 1 || nombre.includes('creada')) return '#880E4F';
        if (estatusId === 2 || nombre.includes('revision')) return '#E91E63';
        if (estatusId === 3 || nombre.includes('cotizacion')) return '#FF9800';
        if (estatusId === 4 || nombre.includes('aprobacion')) return '#8BC34A';
        if (estatusId === 5 || nombre.includes('orden')) return '#03A9F4';
        if (estatusId === 6 || nombre.includes('transito')) return '#2196F3';
        if (estatusId === 7 || nombre.includes('recibido')) return '#3F51B5';
        if (estatusId === 8 || nombre.includes('cerrada')) return '#1A237E';
        return '#C4C4C4';
    }

    getCuadranteColor(id: number): string {
        if (id === 1) return '#FB275D'; // Rojo
        if (id === 2) return '#FFCB00'; // Dorado
        if (id === 3) return '#3B82F6'; // Azul
        if (id === 4) return '#22C55E'; // Verde
        return '#94A3B8';
    }

    getCuadranteName(id: number): string {
        const c = this.cuadrantesList.find(x => x.id === id);
        return c ? c.nombre : 'Sin cuadrante';
    }

    private _calculateKPIs(): void
    {
        const filtered = this.dataSource.filteredData;
        this.totalSolicitudes = filtered.length;
        
        // Multi-currency totals
        this.totalsByCurrency = {};
        filtered.forEach(s => {
            const mon = (s.moneda || 'MXN').toUpperCase();
            this.totalsByCurrency[mon] = (this.totalsByCurrency[mon] || 0) + (s.monto || 0);
        });

        // Still calculate a normalized total for the average cost if useful
        const investmentTotalMXN = filtered.reduce((acc, s) => {
            const montoMXN = this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda);
            return acc + montoMXN;
        }, 0);
        this.avgCost = this.totalSolicitudes > 0 ? investmentTotalMXN / this.totalSolicitudes : 0;
        
        const closed = filtered.filter(s => s.idEstatus === 8 || s.nombreEstatus.toLowerCase().includes('cerrada')).length;
        this.efficiencyRate = this.totalSolicitudes > 0 ? (closed / this.totalSolicitudes) * 100 : 0;

        this.countCreada = filtered.filter(s => s.idEstatus === 1 || s.nombreEstatus.toLowerCase().includes('creada')).length;
        this.countRevision = filtered.filter(s => s.idEstatus === 2 || s.nombreEstatus.toLowerCase().includes('revision')).length;
        this.countCotizacion = filtered.filter(s => s.idEstatus === 3 || s.nombreEstatus.toLowerCase().includes('cotizacion')).length;
        this.countAprobacion = filtered.filter(s => s.idEstatus === 4 || s.nombreEstatus.toLowerCase().includes('aprobacion')).length;
        this.countOC = filtered.filter(s => s.idEstatus === 5 || s.nombreEstatus.toLowerCase().includes('orden')).length;
        this.countTransito = filtered.filter(s => s.idEstatus === 6 || s.nombreEstatus.toLowerCase().includes('transito')).length;
        this.countRecibido = filtered.filter(s => s.idEstatus === 7 || s.nombreEstatus.toLowerCase().includes('recibido')).length;
        this.countCerrada = filtered.filter(s => s.idEstatus === 8 || s.nombreEstatus.toLowerCase().includes('cerrada')).length;
    }

    exportToCSV(): void {
        const solicitudes = this.dataSource.filteredData;
        if (!solicitudes || solicitudes.length === 0) return;

        const headers = [
            'Folio', 
            'Folio OC', 
            'Fecha', 
            'Sucursal', 
            'Área', 
            'Solicitante', 
            'Proyecto', 
            'Prioridad', 
            'Proveedor', 
            'Banco', 
            'Cuenta', 
            'CLABE', 
            'Moneda',
            'Monto', 
            'Monto (MXN)',
            'Centro Costo', 
            'Estatus'
        ];
        const cleanText = (text: any) => `"${String(text || '').replace(/"/g, '""')}"`;

        const rows = solicitudes.map(s => [
            s.idSolicitud,
            cleanText(s.folioOC),
            s.fechaSolicitud ? new Date(s.fechaSolicitud).toLocaleDateString() : '',
            cleanText(s.sucursal),
            cleanText(s.areaSolicitante),
            cleanText(this.getUserLabel(s.idPersonaSolicitante)),
            cleanText(s.proyectoCliente),
            cleanText(s.prioridad),
            cleanText(s.proveedorSugerido),
            cleanText(s.banco),
            cleanText(s.cuenta),
            cleanText(s.clabe),
            cleanText(s.moneda),
            s.monto || 0,
            this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda),
            cleanText(s.centroCosto),
            cleanText(this.getStatusName(s.idEstatus))
        ]);

        const csvContent = '\ufeff' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Historico_Compras_${new Date().getTime()}.csv`;
        link.click();
    }
}
