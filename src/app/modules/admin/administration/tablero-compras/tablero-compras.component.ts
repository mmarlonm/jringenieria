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
import { ExchangeRateService } from 'app/core/services/exchange-rate.service';
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
        'esAprobada',
        'aprobacionCredito',
        'folioOC',
        'fechaSolicitud',
        'sucursal',
        'areaSolicitante',
        'solicitante',
        'tipoCompra',
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
    totalsByCurrency: { [key: string]: number } = {};

    usuarios: any[] = [];
    selectedStatusId: number | null = null;
    showFilters: boolean = true;

    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }
    
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
        banco: '',
        cuenta: '',
        clabe: '',
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
        public _exchangeRateService: ExchangeRateService,
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
                // Filter out 'Pendiente' and 'Liquidado' if they appear in general statuses
                this.estatus = (estatus || []).filter(e => 
                    e.nombreEstatus && 
                    !e.nombreEstatus.toLowerCase().includes('pendiente') && 
                    !e.nombreEstatus.toLowerCase().includes('liquidado')
                );
            });

        // Get solicitudes
        this._solicitudCompraService.solicitudes$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((solicitudes) => {
                // Flatten provider bank info for display
                const mapped = (solicitudes || []).map(s => {
                    const selectedProv = s.proveedores?.find(p => p.esSeleccionado);
                    return {
                        ...s,
                        banco: s.banco || selectedProv?.banco || '',
                        cuenta: s.cuenta || selectedProv?.cuenta || '',
                        clabe: s.clabe || selectedProv?.clabe || '',
                        proveedorSugerido: s.proveedorSugerido || selectedProv?.razonSocial || ''
                    };
                });

                this.dataSource.data = mapped;
                this.dataSource.sort = this.sort;
                this._setupFilterPredicate();
                this._updateFilter();
                this._calculateKPIs();
                this._extractUniqueValues(mapped);
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
                title: '',
                html: `
                    <div class="swal-custom-container p-2">
                        <div class="flex items-center gap-4 mb-8 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                           <!-- Decorative background element -->
                           <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                           
                           <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                           </div>
                           <div class="text-left">
                               <h4 class="text-lg font-extrabold text-gray-900 tracking-tight leading-tight">Generar Orden de Compra</h4>
                               <p class="text-xs font-medium text-gray-500 mt-0.5">Asigna el folio oficial de Contpac para proceder</p>
                           </div>
                        </div>

                        <div class="space-y-6 text-left">
                            <div class="group">
                                <label for="swal-input-folio" class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Folio Contpac / OC <span class="text-rose-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111 2.586V4a1 1 0 001 1h1.586A1 1 0 0115 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <input id="swal-input-folio" 
                                           class="block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all duration-300" 
                                           placeholder="Ej: BC-123456" 
                                           type="text">
                                </div>
                            </div>

                            <div>
                                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Archivo OD / Soporte <span class="text-gray-300 font-normal">(Opcional)</span></label>
                                <div class="drop-zone relative flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-white hover:border-blue-400 transition-all duration-300 cursor-pointer p-8 group/drop" 
                                     onclick="document.getElementById('swal-input-file').click()">
                                    <div class="flex-shrink-0 mb-3 w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover/drop:bg-blue-50 group-hover/drop:text-blue-500 transition-all duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-sm font-bold text-gray-700">Selecciona o arrastra el archivo</p>
                                        <p class="text-[10px] text-gray-400 mt-1 font-medium">PDF, JPG, PNG o DOCX (Máx. 10MB)</p>
                                    </div>
                                    <input id="swal-input-file" class="hidden" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                                    
                                    <div id="file-preview" class="hidden mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3 w-full animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div class="flex-shrink-0 w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                            </svg>
                                        </div>
                                        <div class="flex-auto min-w-0">
                                            <p id="file-name" class="text-xs font-bold text-emerald-800 truncate">archivo_seleccionado.pdf</p>
                                            <p class="text-[9px] text-emerald-600 font-bold uppercase mt-0.5 tracking-tighter">Archivo listo para subir</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Generar Orden de Compra',
                cancelButtonText: 'Cancelar',
                buttonsStyling: false,
                customClass: {
                    popup: 'rounded-[32px] p-6 shadow-2xl border-0',
                    confirmButton: 'inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl transition-all duration-300 shadow-xl shadow-blue-200 mt-4 mx-2 basis-1/2',
                    cancelButton: 'inline-flex items-center justify-center px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-2xl transition-all duration-300 mt-4 mx-2 basis-1/2'
                },
                showLoaderOnConfirm: true,
                preConfirm: () => {
                    const folio = (document.getElementById('swal-input-folio') as HTMLInputElement).value;
                    const file = (document.getElementById('swal-input-file') as HTMLInputElement).files?.[0];
                    if (!folio) {
                        Swal.showValidationMessage('El Folio OC es requerido');
                        return false;
                    }
                    return { folio, file };
                },
                didOpen: () => {
                    const fileInput = document.getElementById('swal-input-file') as HTMLInputElement;
                    const fileNameSpan = document.getElementById('file-name');
                    const filePreview = document.getElementById('file-preview');
                    const dropZone = document.querySelector('.drop-zone');

                    fileInput.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                            fileNameSpan.textContent = file.name;
                            filePreview.classList.remove('hidden');
                            dropZone.classList.add('border-emerald-400', 'bg-emerald-50/10');
                            dropZone.classList.remove('border-gray-200');
                        }
                    };
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    this._ejecutarCambioEstatus(id, idEstatus, result.value.folio, result.value.file);
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
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup: 'rounded-3xl p-6 shadow-2xl border-0',
                    confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary-600 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2',
                    cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    this._ejecutarCambioEstatus(id, idEstatus);
                }
            });
        }
    }

    private _ejecutarCambioEstatus(id: number, idEstatus: number, folioOc?: string, archivo?: File): void {
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
                    if (archivo) {
                        this._solicitudCompraService.subirArchivo(id, archivo)
                            .subscribe({
                                next: () => {
                                    Swal.fire({
                                        title: '¡Éxito!',
                                        text: 'Estatus y archivo actualizados correctamente',
                                        icon: 'success',
                                        timer: 2000,
                                        showConfirmButton: false
                                    });
                                    this._solicitudCompraService.getTodas().subscribe();
                                },
                                error: (err) => {
                                    console.error('Error al subir archivo:', err);
                                    Swal.fire({
                                        title: 'Estatus actualizado',
                                        text: 'El estatus se actualizó, pero hubo un error al subir el archivo.',
                                        icon: 'warning',
                                        confirmButtonText: 'Entendido'
                                    });
                                    this._solicitudCompraService.getTodas().subscribe();
                                }
                            });
                    } else {
                        Swal.fire({
                            title: '¡Éxito!',
                            text: 'Estatus actualizado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this._solicitudCompraService.getTodas().subscribe();
                    }
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

        if (estadoFinal === 1 || estadoFinal === 2) {
            // Configuration for the modal based on state
            const config = {
                title: estadoFinal === 1 ? 'Marcar como Liquidado' : 'Registrar Anticipo',
                subtitle: estadoFinal === 1 ? 'Sube el comprobante de pago para finalizar' : 'Sube el comprobante del pago anticipado',
                confirmText: estadoFinal === 1 ? 'Confirmar Liquidación' : 'Confirmar Anticipo',
                icon: estadoFinal === 1 
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
                gradient: estadoFinal === 1 ? 'from-emerald-50 to-teal-50' : 'from-blue-50 to-sky-50',
                border: estadoFinal === 1 ? 'border-emerald-100' : 'border-blue-100',
                iconBg: estadoFinal === 1 ? 'bg-emerald-600' : 'bg-blue-600',
                iconShadow: estadoFinal === 1 ? 'shadow-emerald-200' : 'shadow-blue-200',
                dropHover: estadoFinal === 1 ? 'hover:border-emerald-400' : 'hover:border-blue-400',
                dropIconColor: estadoFinal === 1 ? 'group-hover/drop:text-emerald-500' : 'group-hover/drop:text-blue-500',
                dropBgColor: estadoFinal === 1 ? 'group-hover/drop:bg-emerald-50' : 'group-hover/drop:bg-blue-50',
                confirmBg: estadoFinal === 1 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700',
                confirmShadow: estadoFinal === 1 ? 'shadow-emerald-200' : 'shadow-blue-200'
            };

            // Liquidado or Anticipo: Show file upload modal
            Swal.fire({
                title: '',
                html: `
                    <div class="swal-custom-container p-2">
                        <div class="flex items-center gap-4 mb-8 p-5 bg-gradient-to-br ${config.gradient} rounded-2xl border ${config.border} shadow-sm relative overflow-hidden">
                           <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-gray-500/5 rounded-full blur-2xl"></div>
                           <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center ${config.iconBg} text-white rounded-xl shadow-lg ${config.iconShadow}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    ${config.icon}
                                </svg>
                           </div>
                           <div class="text-left">
                               <h4 class="text-lg font-extrabold text-gray-900 tracking-tight leading-tight">${config.title}</h4>
                               <p class="text-xs font-medium text-gray-500 mt-0.5">${config.subtitle}</p>
                           </div>
                        </div>

                        <div class="space-y-6 text-left">
                            <div>
                                <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Comprobante <span class="text-rose-500">*</span></label>
                                <div class="drop-zone relative flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-white ${config.dropHover} transition-all duration-300 cursor-pointer p-8 group/drop" 
                                     onclick="document.getElementById('swal-input-file-liq').click()">
                                    <div class="flex-shrink-0 mb-3 w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 ${config.dropBgColor} ${config.dropIconColor} transition-all duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-sm font-bold text-gray-700">Selecciona el comprobante</p>
                                        <p class="text-[10px] text-gray-400 mt-1 font-medium">PDF, JPG, PNG (Máx. 10MB)</p>
                                    </div>
                                    <input id="swal-input-file-liq" class="hidden" type="file" accept=".pdf,.jpg,.jpeg,.png">
                                    
                                    <div id="file-preview-liq" class="hidden mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3 w-full animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div class="flex-shrink-0 w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                            </svg>
                                        </div>
                                        <div class="flex-auto min-w-0">
                                            <p id="file-name-liq" class="text-xs font-bold text-emerald-800 truncate">archivo_seleccionado.pdf</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: config.confirmText,
                cancelButtonText: 'Cancelar',
                buttonsStyling: false,
                customClass: {
                    popup: 'rounded-[32px] p-6 shadow-2xl border-0',
                    confirmButton: `inline-flex items-center justify-center px-8 py-4 ${config.confirmBg} text-white text-sm font-bold rounded-2xl transition-all duration-300 shadow-xl ${config.confirmShadow} mt-4 mx-2 basis-1/2`,
                    cancelButton: 'inline-flex items-center justify-center px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-2xl transition-all duration-300 mt-4 mx-2 basis-1/2'
                },
                showLoaderOnConfirm: true,
                preConfirm: () => {
                    const file = (document.getElementById('swal-input-file-liq') as HTMLInputElement).files?.[0];
                    if (!file) {
                        Swal.showValidationMessage('El comprobante es requerido');
                        return false;
                    }
                    return { file };
                },
                didOpen: () => {
                    const fileInput = document.getElementById('swal-input-file-liq') as HTMLInputElement;
                    const fileNameSpan = document.getElementById('file-name-liq');
                    const filePreview = document.getElementById('file-preview-liq');
                    const dropZone = document.querySelector('.drop-zone');

                    fileInput.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                            fileNameSpan.textContent = file.name;
                            filePreview.classList.remove('hidden');
                            if (dropZone) {
                                dropZone.classList.add('border-emerald-400', 'bg-emerald-50/10');
                                dropZone.classList.remove('border-gray-200');
                            }
                        }
                    };
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    this._ejecutarEstadoLiquidacion(row, estadoFinal, textoEstado, result.value.file);
                }
            });
        } else {
            // Normal state change (Pendiente)
            this._ejecutarEstadoLiquidacion(row, estadoFinal, textoEstado);
        }
    }

    private _ejecutarEstadoLiquidacion(row: any, estadoFinal: number, textoEstado: string, archivo?: File): void {
        this._solicitudCompraService.actualizarEstadoLiquidacion(row.idSolicitud, estadoFinal)
            .subscribe({
                next: () => {
                    row.estadoLiquidacion = estadoFinal;
                    if (archivo) {
                        this._solicitudCompraService.subirArchivo(row.idSolicitud, archivo).subscribe({
                            next: () => {
                                Swal.fire({
                                    title: '¡Éxito!',
                                    text: `Estado actualizado a ${textoEstado} con comprobante`,
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            },
                            error: () => {
                                Swal.fire('Atención', 'Se cambió el estado pero el archivo no se pudo subir', 'warning');
                            }
                        });
                    } else {
                        Swal.fire({
                            title: '¡Éxito!',
                            text: `Estado de liquidación actualizado a: ${textoEstado}`,
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
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
                        data.nombreAprobadorCredito,
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
                const passBanco = !adv.banco || (data.banco || '').toLowerCase().includes(adv.banco.toLowerCase());
                const passCuenta = !adv.cuenta || (data.cuenta || '').toLowerCase().includes(adv.cuenta.toLowerCase());
                const passClabe = !adv.clabe || (data.clabe || '').toLowerCase().includes(adv.clabe.toLowerCase());
                const passBancos = !adv.datosBancariosProveedor || (data.datosBancariosProveedor || '').toLowerCase().includes(adv.datosBancariosProveedor.toLowerCase());
                const passLugar = !adv.lugarEntrega || (data.lugarEntrega || '').toLowerCase().includes(adv.lugarEntrega.toLowerCase());
                const passComentarios = !adv.comentariosObservaciones || (data.comentariosObservaciones || '').toLowerCase().includes(adv.comentariosObservaciones.toLowerCase());

                return passGlobal && passStatusProcess && passPriorityProcess && passCuadranteProcess &&
                       passIdSolicitud && passFolioOC && passFechaSol && passFechaReq && passSucursal && passArea && 
                       passSolicitante && passProyecto && passFolioProj && passPrioridad && passProveedor && 
                       passMoneda && passCentroCosto && passEstatus && passPago && passCuadrante &&
                       passMonto && passTipo && passBanco && passCuenta && passClabe && passBancos && passLugar && passComentarios;
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
        if (estatusId === 4 || nombre.includes('aprobada') || nombre.includes('aprobación') || nombre.includes('aprobacion')) return '#8BC34A';
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
        this.countAprobacion = solicitudes.filter(s => s.idEstatus === 4 || s.nombreEstatus.toLowerCase().includes('aprobada') || s.nombreEstatus.toLowerCase().includes('aprobacion') || s.nombreEstatus.toLowerCase().includes('aprobación')).length;
        this.countOC = solicitudes.filter(s => s.idEstatus === 5 || s.nombreEstatus.toLowerCase().includes('orden')).length;
        this.countTransito = solicitudes.filter(s => s.idEstatus === 6 || s.nombreEstatus.toLowerCase().includes('transito') || s.nombreEstatus.toLowerCase().includes('tránsito')).length;
        this.countRecibido = solicitudes.filter(s => s.idEstatus === 7 || s.nombreEstatus.toLowerCase().includes('recibido')).length;
        this.countCerrada = solicitudes.filter(s => s.idEstatus === 8 || s.nombreEstatus.toLowerCase().includes('cerrada')).length;

        // Calculate totals by currency
        this.totalsByCurrency = {};
        solicitudes.forEach(s => {
            const mon = (s.moneda || 'MXN').toUpperCase();
            this.totalsByCurrency[mon] = (this.totalsByCurrency[mon] || 0) + (s.monto || 0);
        });
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
            'Banco',
            'Cuenta',
            'CLABE',
            'Fecha Requerida',
            'Lugar Entrega',
            'Moneda',
            'Monto',
            'Monto (MXN)',
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
            cleanText(s.banco),
            cleanText(s.cuenta),
            cleanText(s.clabe),
            s.fechaRequerida ? new Date(s.fechaRequerida).toLocaleDateString() : '',
            cleanText(s.lugarEntrega),
            cleanText(s.moneda),
            s.monto || 0,
            this._exchangeRateService.convertMontoToMXN(s.monto || 0, s.moneda),
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
            banco: '',
            cuenta: '',
            clabe: '',
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
