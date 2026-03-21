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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';
import { SolicitudCompraService } from '../solicitudes-compra/solicitud-compra.service';
import { SolicitudCompra, CatEstatusCompra } from '../solicitudes-compra/models/solicitud-compra.types';
import { SolicitudDetalleDialogComponent } from './solicitud-detalle-dialog/solicitud-detalle-dialog.component';
import { HistorialDialogComponent } from './historial-dialog/historial-dialog.component';
import { UsersService } from 'app/modules/admin/security/users/users.service';
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
        HistorialDialogComponent,
        RouterLink,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSelectModule
    ]
})
export class TableroComprasComponent implements OnInit, OnDestroy {
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
        'datosBancarios',
        'fechaRequerida',
        'lugarEntrega',
        'moneda',
        'monto',
        'tipoCompra',
        'centroCosto',
        'comentarios',
        'cuadranteId',
        'estatus',
        'estadoLiquidacion',
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

    usuarios: any[] = [];
    selectedStatusId: number | null = null;
    
    // Advanced Filters
    filterValues: any = {
        idSolicitud: '',
        folioOC: '',
        fechaSolicitud: null,
        sucursal: '',
        areaSolicitante: '',
        idPersonaSolicitante: '',
        proyectoCliente: '',
        folioProyecto: '',
        prioridad: '',
        proveedorSugerido: '',
        fechaRequerida: null,
        moneda: '',
        centroCosto: '',
        nombreEstatus: '',
        estadoLiquidacion: '',
        cuadranteId: '',
        monto: '',
        tipoCompra: '',
        datosBancariosProveedor: '',
        lugarEntrega: '',
        comentariosObservaciones: ''
    };

    // Unique values for selects
    sucursales: string[] = [];
    areas: string[] = [];
    prioridades: string[] = [];
    monedas: string[] = [];
    estatusDisponibles: string[] = [];
    pagosDisponibles: string[] = [];
    tiposCompra: string[] = [];

    fechaInicio: any = '';
    fechaFin: any = '';
    filtroSearch: string = '';
    filtroPrioridad: string = '';
    filtroCuadrante: any = '';

    prioridadesList = ['Urgente', 'Alta', 'Normal'];
    cuadrantesList = [
        { id: 1, nombre: 'Importante y Urgente' },
        { id: 2, nombre: 'Importante, No Urgente' },
        { id: 3, nombre: 'No Importante, Urgente' },
        { id: 4, nombre: 'No Importante, No Urgente' }
    ];

    @ViewChild(MatSort) sort: MatSort;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _solicitudCompraService: SolicitudCompraService,
        private _usersService: UsersService,
        private _dialog: MatDialog
    ) {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {
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
                this._setupFilterPredicate();
                this._updateFilter(); // Initialize current filter state
                this._calculateKPIs();
                this._extractUniqueValues(solicitudes);
            });

        // Get users
        this._usersService.getUsers()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((users) => {
                this.usuarios = users || [];
            });

        // Load initial data
        this._solicitudCompraService.getEstatus().subscribe();

        // Default dates: First day of current month and Today
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

        this.fechaInicio = firstDay.toISOString().split('T')[0];
        this.fechaFin = now.toISOString().split('T')[0];

        this._solicitudCompraService.getTodas(this.fechaInicio, this.fechaFin).subscribe();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    verDetalle(idSolicitud: number): void {
        this._dialog.open(SolicitudDetalleDialogComponent, {
            data: { idSolicitud },
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            autoFocus: false
        });
    }

    getUserLabel(idUsuario: number): string {
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

    cambiarEstatus(id: number, idEstatus: number): void {
        const estatusNuevo = this.estatus.find(e => e.idEstatus === idEstatus);

        if (idEstatus === 5 || estatusNuevo?.nombreEstatus.toLowerCase().includes('orden')) {
            Swal.fire({
                title: 'Orden de Compra',
                text: 'Por favor, ingresa el Folio de la Orden de Compra:',
                input: 'text',
                inputAttributes: {
                    autocapitalize: 'off',
                    required: 'true'
                },
                showCancelButton: true,
                confirmButtonText: 'Guardar Estatus',
                cancelButtonText: 'Cancelar',
                showLoaderOnConfirm: true,
                preConfirm: (folio) => {
                    if (!folio) {
                        Swal.showValidationMessage('El Folio OC es requerido para este estatus');
                        return false;
                    }
                    return folio;
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    this._ejecutarCambioEstatus(id, idEstatus, result.value);
                }
            });
        } else {
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
                    this._ejecutarCambioEstatus(id, idEstatus);
                }
            });
        }
    }

    private _ejecutarCambioEstatus(id: number, idEstatus: number, folioOc?: string): void {
        const userObjStr = localStorage.getItem('userInformation');
        let idUsuario = 0;
        if (userObjStr) {
            try {
                const userObj = JSON.parse(userObjStr);
                idUsuario = userObj?.usuario?.id || 0;
            } catch (e) {
                console.error('Error parsing user object from localStorage', e);
            }
        }

        this._solicitudCompraService.actualizarEstatus(id, idEstatus, folioOc, idUsuario)
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
                error: (error) => {
                    console.error('Error al actualizar estatus:', error);
                    const mensaje = error.error?.message || error.error?.mensaje || 'No se pudo actualizar el estatus';
                    Swal.fire({
                        title: 'Atención',
                        text: mensaje,
                        icon: 'warning',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#3085d6'
                    });
                    // Refresh data to ensure UI is in sync with server state
                    this._solicitudCompraService.getTodas().subscribe();
                }
            });
    }

    cambiarEstadoLiquidacion(row: any, nuevoEstado?: number): void {
        const estadoFinal = nuevoEstado !== undefined ? nuevoEstado : (row.estadoLiquidacion === 0 ? 1 : 0);
        let textoEstado = 'Pendiente';
        if (estadoFinal === 1) textoEstado = 'Liquidado';
        if (estadoFinal === 2) textoEstado = 'Anticipo';

        this._solicitudCompraService.actualizarEstadoLiquidacion(row.idSolicitud, estadoFinal)
            .subscribe({
                next: () => {
                    row.estadoLiquidacion = estadoFinal;
                    Swal.fire({
                        title: '¡Éxito!',
                        text: `Estado de liquidación actualizado a: ${textoEstado}`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                },
                error: (error) => {
                    console.error('Error al actualizar estado de liquidación', error);
                    Swal.fire('Error', 'No se pudo actualizar el estado de liquidación', 'error');
                }
            });
    }

    applyFilter(event: Event): void {
        this.filtroSearch = (event.target as HTMLInputElement).value;
        this._updateFilter();

        // Reset process filter when using search
        if (this.filtroSearch) {
            this.selectedStatusId = null;
        }
    }

    private _setupFilterPredicate(): void {
        this.dataSource.filterPredicate = (data: SolicitudCompra, filter: string) => {
            try {
                const filterObj = JSON.parse(filter);

                // 1. Global Search
                const searchStr = (filterObj.search || '').trim().toLowerCase();
                let passGlobal = true;
                if (searchStr) {
                    const solicitante = this.getUserLabel(data.idPersonaSolicitante);
                    const estatusNom = data.nombreEstatus || '';
                    const pagoStatus = this.getEstadoLiquidacionLabel(data.estadoLiquidacion).toLowerCase();
                    const cuadranteNom = this.getCuadranteName(data.cuadranteId);
                    
                    const searchableValues = [
                        data.idSolicitud,
                        data.folioOC,
                        data.sucursal,
                        data.areaSolicitante,
                        solicitante,
                        data.proyectoCliente,
                        data.folioProyecto,
                        data.prioridad,
                        data.proveedorSugerido,
                        data.moneda,
                        data.monto,
                        data.tipoCompra,
                        data.centroCosto,
                        cuadranteNom,
                        estatusNom,
                        pagoStatus
                    ];

                    passGlobal = searchableValues.some(val => 
                        val !== null && val !== undefined && String(val).toLowerCase().includes(searchStr)
                    );
                }

                // 2. Process Filters (Top Arrows)
                const passStatusProcess = filterObj.statusId ? data.idEstatus === filterObj.statusId : true;

                // 3. Compact Filters (Priority, Cuadrante)
                const passPriorityProcess = filterObj.prioridad ? data.prioridad === filterObj.prioridad : true;
                const passCuadranteProcess = filterObj.cuadranteId !== '' ? data.cuadranteId === Number(filterObj.cuadranteId) : true;

                // 4. Advanced Column Filters
                const adv = filterObj.advanced || {};
                
                const passIdSolicitud = !adv.idSolicitud || String(data.idSolicitud).toLowerCase().includes(adv.idSolicitud.toLowerCase());
                const passFolioOC = !adv.folioOC || (data.folioOC || '').toLowerCase().includes(adv.folioOC.toLowerCase());
                
                // Date Filters
                const passFechaSol = !adv.fechaSolicitud || 
                    (data.fechaSolicitud && new Date(data.fechaSolicitud).toDateString() === new Date(adv.fechaSolicitud).toDateString());
                const passFechaReq = !adv.fechaRequerida || 
                    (data.fechaRequerida && new Date(data.fechaRequerida).toDateString() === new Date(adv.fechaRequerida).toDateString());

                const passSucursal = !adv.sucursal || data.sucursal === adv.sucursal;
                const passArea = !adv.areaSolicitante || data.areaSolicitante === adv.areaSolicitante;
                const passSolicitante = !adv.idPersonaSolicitante || this.getUserLabel(data.idPersonaSolicitante).toLowerCase().includes(adv.idPersonaSolicitante.toLowerCase());
                const passProyecto = !adv.proyectoCliente || (data.proyectoCliente || '').toLowerCase().includes(adv.proyectoCliente.toLowerCase());
                const passFolioProj = !adv.folioProyecto || (data.folioProyecto || '').toLowerCase().includes(adv.folioProyecto.toLowerCase());
                const passPrioridad = !adv.prioridad || data.prioridad === adv.prioridad;
                const passProveedor = !adv.proveedorSugerido || (data.proveedorSugerido || '').toLowerCase().includes(adv.proveedorSugerido.toLowerCase());
                const passMoneda = !adv.moneda || data.moneda === adv.moneda;
                const passCentroCosto = !adv.centroCosto || (data.centroCosto || '').toLowerCase().includes(adv.centroCosto.toLowerCase());
                const passEstatus = !adv.nombreEstatus || data.nombreEstatus === adv.nombreEstatus;
                const passPago = !adv.estadoLiquidacion || this.getEstadoLiquidacionLabel(data.estadoLiquidacion) === adv.estadoLiquidacion;
                const passCuadrante = !adv.cuadranteId || this.getCuadranteName(data.cuadranteId) === adv.cuadranteId;
                const passMonto = !adv.monto || String(data.monto).toLowerCase().includes(adv.monto.toLowerCase());
                const passTipo = !adv.tipoCompra || data.tipoCompra === adv.tipoCompra;
                const passBancos = !adv.datosBancariosProveedor || (data.datosBancariosProveedor || '').toLowerCase().includes(adv.datosBancariosProveedor.toLowerCase());
                const passLugar = !adv.lugarEntrega || (data.lugarEntrega || '').toLowerCase().includes(adv.lugarEntrega.toLowerCase());
                const passComentarios = !adv.comentariosObservaciones || (data.comentariosObservaciones || '').toLowerCase().includes(adv.comentariosObservaciones.toLowerCase());

                return passGlobal && passStatusProcess && passPriorityProcess && passCuadranteProcess &&
                       passIdSolicitud && passFolioOC && passFechaSol && passFechaReq && passSucursal && passArea && 
                       passSolicitante && passProyecto && passFolioProj && passPrioridad && passProveedor && 
                       passMoneda && passCentroCosto && passEstatus && passPago && passCuadrante &&
                       passMonto && passTipo && passBancos && passLugar && passComentarios;
            } catch (e) {
                return true;
            }
        };
    }

    private _updateFilter(): void {
        const filterObj = {
            search: this.filtroSearch,
            statusId: this.selectedStatusId,
            prioridad: this.filtroPrioridad,
            cuadranteId: this.filtroCuadrante,
            advanced: this.filterValues
        };
        this.dataSource.filter = JSON.stringify(filterObj);
    }

    onFilterChange(): void {
        this._updateFilter();
    }

    loadByDateRange(silent: boolean = false): void {
        if (!this.fechaInicio || !this.fechaFin) {
            if (!silent) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Atención',
                    text: 'Por favor selecciona ambas fechas (Inicio y Fin)'
                });
            }
            return;
        }

        // Format dates to YYYY-MM-DD for backend
        const start = this.fechaInicio instanceof Date ? this.fechaInicio.toISOString().split('T')[0] : this.fechaInicio;
        const end = this.fechaFin instanceof Date ? this.fechaFin.toISOString().split('T')[0] : this.fechaFin;

        this._solicitudCompraService.getTodas(start, end).subscribe();
    }

    filterByStatus(statusId: number | null): void {
        if (this.selectedStatusId === statusId) {
            this.selectedStatusId = null;
        } else {
            this.selectedStatusId = statusId;
        }

        this.onFilterChange();
    }

    getStatusName(estatusId: number): string {
        const estatus = this.estatus.find(e => e.idEstatus === estatusId);
        return estatus ? estatus.nombreEstatus : 'Sin Estatus';
    }

    getEstadoLiquidacionLabel(estado: number): string {
        if (estado === 1) return 'Liquidado';
        if (estado === 2) return 'Anticipo';
        return 'Pendiente';
    }

    getColorByEstatusId(estatusId: number): string {
        const nombre = this.getStatusName(estatusId).toLowerCase();

        // Specific colors for the 8 statuses (Matching SCSS process-step colors)
        if (estatusId === 1 || nombre.includes('creada')) return '#880E4F';
        if (estatusId === 2 || nombre.includes('revision') || nombre.includes('revisión') || nombre.includes('reivision')) return '#E91E63';
        if (estatusId === 3 || nombre.includes('cotizacion') || nombre.includes('cotización')) return '#FF9800';
        if (estatusId === 4 || nombre.includes('aprobacion') || nombre.includes('aprobación')) return '#8BC34A';
        if (estatusId === 5 || nombre.includes('orden')) return '#03A9F4';
        if (estatusId === 6 || nombre.includes('transito') || nombre.includes('tránsito')) return '#2196F3';
        if (estatusId === 7 || nombre.includes('recibido')) return '#3F51B5';
        if (estatusId === 8 || nombre.includes('cerrada')) return '#1A237E';

        return '#C4C4C4';
    }

    getFillColorByEstatusId(estatusId: number): string {
        const color = this.getColorByEstatusId(estatusId);
        return color + '15';
    }

    getPendienteTotal(s: SolicitudCompra): number {
        if (!s.detalles) return 0;
        return s.detalles.reduce((acc, current) => acc + (current.pendiente || 0), 0);
    }

    getMontoTotal(s: SolicitudCompra): number {
        return 0; // Or whatever calculation is needed
    }

    getCuadranteName(id: number | null | undefined): string {
        switch (id) {
            case 1: return 'Importante y Urgente';
            case 2: return 'Importante, No Urgente';
            case 3: return 'No Importante, Urgente';
            case 4: return 'No Importante, No Urgente';
            default: return 'Sin asignar';
        }
    }

    getCuadranteColor(id: number | null | undefined): string {
        switch (id) {
            case 1: return '#f43f5e'; // bg-rose-500
            case 2: return '#fbbf24'; // bg-amber-400
            case 3: return '#34d399'; // bg-emerald-400
            case 4: return '#38bdf8'; // bg-sky-400
            default: return '#94a3b8'; // gray-400
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    private _calculateKPIs(): void {
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

    // Detail Helper Methods
    getMateriales(s: SolicitudCompra): string {
        return s.detalles?.map(d => d.materialServicio).filter(Boolean).join(', ') || '-';
    }

    getDescripciones(s: SolicitudCompra): string {
        return s.detalles?.map(d => d.descripcionEspecificacion).filter(Boolean).join(', ') || '-';
    }

    getCantidades(s: SolicitudCompra): string {
        return s.detalles?.map(d => d.cantidad).filter(c => c !== undefined && c !== null).join(', ') || '-';
    }

    getUnidades(s: SolicitudCompra): string {
        return s.detalles?.map(d => d.unidad).filter(Boolean).join(', ') || '-';
    }

    exportToCSV(): void {
        const solicitudes = this.dataSource.filteredData;
        if (!solicitudes || solicitudes.length === 0) return;

        const headers = [
            'Folio',
            'Folio OC',
            'Fecha Solicitud',
            'Sucursal',
            'Área Solicitante',
            'Solicitante',
            'Proyecto/Cliente',
            'Folio Proyecto',
            'Prioridad',
            'Proveedor Sugerido',
            'Fecha Requerida',
            'Lugar Entrega',
            'Moneda',
            'Monto',
            'Tipo Compra',
            'Centro Costo',
            'Estatus',
            'Pago'
        ];

        const cleanText = (text: any) => {
            if (text === null || text === undefined) return '';
            let str = String(text);
            str = str.replace(/\r?\n|\r/g, " ").replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = solicitudes.map(s => [
            s.idSolicitud,
            cleanText(s.folioOC),
            s.fechaSolicitud ? new Date(s.fechaSolicitud).toLocaleDateString() : '',
            cleanText(s.sucursal),
            cleanText(s.areaSolicitante),
            cleanText(this.getUserLabel(s.idPersonaSolicitante)),
            cleanText(s.proyectoCliente),
            cleanText(s.folioProyecto),
            cleanText(s.prioridad),
            cleanText(s.proveedorSugerido),
            s.fechaRequerida ? new Date(s.fechaRequerida).toLocaleDateString() : '',
            cleanText(s.lugarEntrega),
            cleanText(s.moneda),
            s.monto || 0,
            cleanText(s.tipoCompra),
            cleanText(s.centroCosto),
            cleanText(s.nombreEstatus),
            this.getEstadoLiquidacionLabel(s.estadoLiquidacion)
        ]);

        const csvContent = '\ufeff' + [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Tablero_Compras_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    isColumnFiltered(column: string): boolean {
        return !!this.filterValues[column];
    }

    resetAdvancedFilters(): void {
        this.filterValues = {
            idSolicitud: '',
            folioOC: '',
            fechaSolicitud: null,
            sucursal: '',
            areaSolicitante: '',
            idPersonaSolicitante: '',
            proyectoCliente: '',
            folioProyecto: '',
            prioridad: '',
            proveedorSugerido: '',
            fechaRequerida: null,
            moneda: '',
            centroCosto: '',
            nombreEstatus: '',
            estadoLiquidacion: '',
            cuadranteId: '',
            monto: '',
            tipoCompra: '',
            datosBancariosProveedor: '',
            lugarEntrega: '',
            comentariosObservaciones: ''
        };
        this.onFilterChange();
    }

    private _extractUniqueValues(data: SolicitudCompra[]): void {
        this.sucursales = Array.from(new Set(data.map(i => i.sucursal))).filter(x => !!x).sort();
        this.areas = Array.from(new Set(data.map(i => i.areaSolicitante))).filter(x => !!x).sort();
        this.prioridades = Array.from(new Set(data.map(i => i.prioridad))).filter(x => !!x).sort();
        this.monedas = Array.from(new Set(data.map(i => i.moneda))).filter(x => !!x).sort();
        this.estatusDisponibles = Array.from(new Set(data.map(i => i.nombreEstatus))).filter(x => !!x).sort();
        this.pagosDisponibles = Array.from(new Set(data.map(i => this.getEstadoLiquidacionLabel(i.estadoLiquidacion)))).filter(x => !!x).sort();
        this.tiposCompra = Array.from(new Set(data.map(i => i.tipoCompra))).filter(x => !!x).sort();
    }
}
