import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { SolicitudCompraService } from '../solicitud-compra.service';
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import { EngineeringService } from 'app/modules/admin/engineering/engineering.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { SolicitudCompraCreateDto, ProductoBuscadorDto, ProveedorDto, ContpaqiMaterialDto, AnticipoDto } from '../models/solicitud-compra.types';
import { ImportarMaterialesDialogComponent } from './importar-materiales-dialog/importar-materiales-dialog.component';
import { ClientsService } from '../../../catalogs/clients/clients.service';
import { catchError, debounceTime, distinctUntilChanged, filter, forkJoin, map, Observable, of, shareReplay, startWith, switchMap, takeUntil, Subject } from 'rxjs';
import { UsersService } from '../../../security/users/users.service';
import Swal from 'sweetalert2';
import { LectorPdfMateriales } from 'app/shared/materiales/lector-pdf-materiales';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';

@Component({
    selector: 'solicitud-compra-form',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTabsModule,
        MatTooltipModule,
        MatAutocompleteModule,
        MatDialogModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        ImagePreviewDialogComponent
    ]
})
export class SolicitudCompraFormComponent implements OnInit {
    solicitudForm: FormGroup;
    isEdit: boolean = false;
    isSaving: boolean = false;
    solicitudId: number;
    selectedFiles: File[] = [];
    archivos: any[] = [];
    filteredProducts$: Observable<ProductoBuscadorDto[]>[] = [];
    proyectos: any[] = [];
    clientes: any[] = [];
    filteredProyectos$: Observable<any[]>;
    filteredClientes$: Observable<any[]>;
    filteredProveedoresRows$: Observable<ProveedorDto[]>[] = [];
    filteredBancos$: Observable<string[]>;
    private _bancoSearch$ = new Subject<string>();
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    currentUserId: number = 0;
    anticipos: AnticipoDto[] = [];

    // Select options
    prioridades = ['Urgente', 'Alta', 'Normal', 'Venta Confirmada'];
    tiposCompra = ['Material para proyecto', 'Inventario almacén', 'Herramienta', 'Consumible', 'Servicio', 'VENTA CONFIRMADA', 'Marketing'];
    centrosCosto = ['Proyecto específico', 'Operación sucursal', 'Administración'];
    areas = ['Proyectos', 'Almacén', 'Ventas', 'Administración', 'Marketing', 'RH'];
    formasPago = ['CONTADO (PUE)', 'CREDITO (PPD)'];
    razonesSociales = ['Jesus Ricardo Mendez Arrillaga', 'JR Ingenieria Electrica'];
    cuadrantes = [
        { id: 1, nombre: 'Rojo - Urgente (Mismo día / Vencida)' },
        { id: 2, nombre: 'Amarillo - Medio (Planeado 1 a 3 días)' },
        { id: 3, nombre: 'Verde - Programado (> 3 días)' }
    ];
    sucursales: any[] = [];
    usuarios: any[] = [];
    aprobadores: any[] = [];
    aprobadoresCredito: any[] = [];

    // Lista de Bancos en México para el autocompletado
    bancosMexico: string[] = [
        'BBVA México',
        'Santander México',
        'Citibanamex',
        'Banorte',
        'HSBC México',
        'Scotiabank México',
        'Banco Inbursa',
        'Banco del Bajío',
        'Banca Afirme',
        'Banregio',
        'Banco Azteca',
        'Bancoppel',
        'Intercam Banco',
        'Banca Mifel',
        'Monex',
        'Banjercito',
        'Wells Fargo'
    ];


    constructor(
        private _formBuilder: FormBuilder,
        private _solicitudCompraService: SolicitudCompraService,
        private _projectService: ProjectService,
        private _clientsService: ClientsService,
        private _usersService: UsersService,
        private _chatNotificationService: ChatNotificationService,
        private _engineeringService: EngineeringService,
        private _route: ActivatedRoute,
        private _router: Router,
        private _dialog: MatDialog,
        private _snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadBranches();
        this.loadUsers();
        this.loadProjects();
        this.loadClients();
        this._setupBancoFilter();

        this.currentUserId = this._getCurrentUserId();
        this._route.params.subscribe(params => {
            if (params['id']) {
                this.isEdit = true;
                this.solicitudId = +params['id'];
                this.loadSolicitud(this.solicitudId);
            }
        });
    }

    private _getCurrentUserId(): number {
        let userId = 1;
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = userInformation.usuario || {};
            userId = user.id || user.usuarioId || 1;
        } catch (e) {
            console.error('Error reading user from localStorage', e);
        }
        return userId;
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    loadUsers(): void {
        this._usersService.getUsers().subscribe(users => {
            this.usuarios = users || [];
            const allowedApproverIds = [14, 13, 16, 6, 12, 20, 18, 9, 53];
            const allowedCreditoApproverIds = [14, 13, 16, 6, 12, 20, 18, 9];

            this.aprobadores = this.usuarios.filter(user => {
                const id = user.usuarioId || user.id;
                return allowedApproverIds.includes(Number(id));
            });

            this.aprobadoresCredito = this.usuarios.filter(user => {
                const id = user.usuarioId || user.id;
                return allowedCreditoApproverIds.includes(Number(id));
            });
        });
    }

    loadProjects(): void {
        this._engineeringService.getListadoSeleccionProyectos(this.currentUserId).subscribe((response: any) => {
            this.proyectos = response?.data || response || [];
            this._setupProjectFilter();
            
            // Forzar actualización del control para que el filtro se ejecute con los proyectos ya cargados
            const control = this.solicitudForm.get('folioProyecto');
            if (control) {
                control.updateValueAndValidity({ emitEvent: true });
            }
        });
    }

    loadClients(): void {
        this._clientsService.getClient().subscribe((clients) => {
            this.clientes = clients || [];
            this._setupClientFilter();
        });
    }

    initForm(): void {
        this.solicitudForm = this._formBuilder.group({
            idSolicitud: [0],
            folioOC: [''],
            sucursal: ['', Validators.required],
            areaSolicitante: ['', Validators.required],
            tipoOperacion: [1, Validators.required],
            idPersonaSolicitante: [this.currentUserId],
            idAprobador: [null, Validators.required],
            esAprobada: [false],
            fechaAprobacion: [null],
            proyectoCliente: [''],
            cliente: [''],
            esRecurrente: [false],
            lugarEntrega: [''],
            datosBancariosProveedor: [''],
            comentariosObservaciones: [''],
            prioridad: ['Normal', Validators.required],
            proveedorSugerido: [''],
            fechaRequerida: [new Date(), Validators.required],
            tipoCompra: ['', Validators.required],
            centroCosto: ['', Validators.required],
            folioProyecto: [''],
            idSeguimiento: [null],
            moneda: ['MXN', Validators.required],
            formaPago: ['', Validators.required],
            razonSocial: ['', Validators.required], // Internal company
            monto: [0, [Validators.required, Validators.min(0.01)]],
            subtotal: [0],
            iva: [0],
            isrRetenido: [0],
            descuento: [0],
            totalPiezas: [0],
            cuadranteId: [null, Validators.required],
            idAprobadorCredito: [null],
            esAprobadaCredito: [false],
            fechaAprobacionCredito: [null],
            detalles: this._formBuilder.array([]), // Removed required validator
            proveedores: this._formBuilder.array([])
        });

        // Initialize with at least one supplier row if not editing
        if (!this.isEdit) {
            this.addProveedor();
        }

        this._setupCalculationListener();
        this._setupFormaPagoListener();
        this._setupFechaRequeridaListener();
    }

    private _setupFechaRequeridaListener(): void {
        this.solicitudForm.get('fechaRequerida').valueChanges.pipe(
            takeUntil(this._unsubscribeAll)
        ).subscribe(fecha => {
            if (fecha && !this.isEdit) {
                const reqDate = new Date(fecha);
                if (!isNaN(reqDate.getTime())) {
                    const hoy = new Date();
                    reqDate.setHours(0, 0, 0, 0);
                    hoy.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((reqDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    let autoNivel = 3;
                    if (diffDays <= 0) autoNivel = 1;
                    else if (diffDays <= 3) autoNivel = 2;
                    else autoNivel = 3;

                    this.solicitudForm.get('cuadranteId').setValue(autoNivel, { emitEvent: false });
                }
            }
        });
    }

    private _setupFormaPagoListener(): void {
        this.solicitudForm.get('formaPago').valueChanges.pipe(
            takeUntil(this._unsubscribeAll),
            startWith(this.solicitudForm.get('formaPago').value)
        ).subscribe(value => {
            const approverControl = this.solicitudForm.get('idAprobadorCredito');
            if (value === 'CREDITO (PPD)') {
                approverControl.setValidators([Validators.required]);
            } else {
                approverControl.clearValidators();
                approverControl.setValue(null, { emitEvent: false });
            }
            approverControl.updateValueAndValidity({ emitEvent: false });
        });
    }

    loadBranches(): void {
        this._projectService.getUnidadesDeNegocio().subscribe(branches => {
            this.sucursales = branches;
            if (!this.sucursales.find(s => s.nombre === 'Otro')) {
                this.sucursales.push({ id: 0, nombre: 'Otro' });
            }
        });
    }

    get detalles(): FormArray {
        return this.solicitudForm.get('detalles') as FormArray;
    }

    get proveedoresRows(): FormArray {
        return this.solicitudForm.get('proveedores') as FormArray;
    }

    addProveedor(): void {
        const proveedorForm = this._formBuilder.group({
            idSolicitudProveedor: [0],
            razonSocial: ['', Validators.required],
            rfc: [''],
            banco: [''],
            cuenta: [''],
            clabe: [''],
            regimenFiscal: [''],
            usoCfdi: [''],
            esSeleccionado: [this.proveedoresRows.length === 0], // First one selected by default
            comentarios: ['']
        });

        const index = this.proveedoresRows.length;
        this.proveedoresRows.push(proveedorForm);
        this._setupProveedorFilterForRow(index);
    }

    removeProveedor(index: number): void {
        if (this.proveedoresRows.length <= 1) return;
        this.proveedoresRows.removeAt(index);
        this.filteredProveedoresRows$.splice(index, 1);
    }

    selectProveedorWinner(index: number): void {
        this.proveedoresRows.controls.forEach((control, i) => {
            control.get('esSeleccionado').setValue(i === index, { emitEvent: false });
        });
    }

    private _setupProveedorFilterForRow(index: number): void {
        const control = this.proveedoresRows.at(index).get('razonSocial');
        this.filteredProveedoresRows$[index] = control.valueChanges.pipe(
            startWith(''),
            debounceTime(400),
            distinctUntilChanged(),
            switchMap(value => {
                if (typeof value === 'string' && value.trim().length >= 2) {
                    return this._solicitudCompraService.buscarProveedores(value.trim());
                }
                return of([] as ProveedorDto[]);
            }),
            shareReplay(1)
        );
    }

    onProveedorSelectedForRow(event: any, index: number): void {
        const proveedor = event.option.value as ProveedorDto;
        const row = this.proveedoresRows.at(index);

        // cuenta_Bancaria viene de CONTPAQi y se mapea al campo clabe (CLABE interbancaria)
        const clabeValue = proveedor.cuenta_Bancaria || proveedor.clabe || '';

        row.patchValue({
            razonSocial: proveedor.nombre,
            rfc: proveedor.rfc,
            banco: proveedor.banco || '',
            cuenta: proveedor.cuenta || '',
            clabe: clabeValue,
            regimenFiscal: proveedor.regimenFiscal || '',
            usoCfdi: proveedor.usoCfdi || ''
        }, { emitEvent: false });
    }

    addDetalle(): void {
        const detalleForm = this._formBuilder.group({
            idDetalle: [0],
            partida: [this.detalles.length + 1],
            materialServicio: ['', Validators.required],
            descripcionEspecificacion: [''],
            cantidad: [1, [Validators.required, Validators.min(0.01)]],
            unidad: ['', Validators.required],
            observaciones: [''],
            monto: [0, [Validators.required, Validators.min(0)]],
            iva: [0]
        });

        const index = this.detalles.length;
        this.detalles.push(detalleForm);
        this._setupProductSearch(index);
    }

    private _setupProjectFilter(): void {
        const control = this.solicitudForm.get('folioProyecto');
        this.filteredProyectos$ = control.valueChanges.pipe(
            startWith(''),
            debounceTime(200),
            map(value => {
                const name = typeof value === 'string' ? value : '';
                return name ? this._filterProjects(name) : this.proyectos.slice();
            })
        );
    }

    private _filterProjects(name: string): any[] {
        const filterValue = name.toLowerCase();
        return this.proyectos.filter(p =>
            String(p.proyectoId || p.idSeguimiento || p.id || '').toLowerCase().includes(filterValue) ||
            String(p.nombre || p.tituloProyecto || p.actividad || p.nombreProyecto || '').toLowerCase().includes(filterValue)
        );
    }

    private _setupClientFilter(): void {
        const control = this.solicitudForm.get('cliente');
        this.filteredClientes$ = control.valueChanges.pipe(
            startWith(''),
            map(value => {
                const name = typeof value === 'string' ? value : '';
                return name ? this._filterClients(name) : this.clientes.slice();
            })
        );
    }

    private _filterClients(name: string): any[] {
        const filterValue = name.toLowerCase();
        return this.clientes.filter(c =>
            String(c.nombre || c.razonSocial || '').toLowerCase().includes(filterValue)
        );
    }

    onProjectSelected(event: any): void {
        const project = event.option.value;
        const projectLabel = `${project.proyectoId || project.idSeguimiento || project.id} - ${project.nombre || project.tituloProyecto || project.actividad || project.nombreProyecto}`;
        const clientLabel = project.clienteNombre || project.empresa || project.nombreCliente || project.cliente || '';

        this.solicitudForm.patchValue({
            folioProyecto: projectLabel,
            idSeguimiento: project.proyectoId || project.idSeguimiento || project.id || null,
            cliente: clientLabel || project.nombre || project.tituloProyecto || project.actividad || project.nombreProyecto
        }, { emitEvent: false });
    }

    onProveedorSelected(event: any): void {
        // Deprecated
    }

    private _setupBancoFilter(): void {
        this.filteredBancos$ = this._bancoSearch$.pipe(
            startWith(''),
            map(value => this._filterBancos(value || ''))
        );
    }

    searchBanco(value: string): void {
        this._bancoSearch$.next(value);
    }

    private _filterBancos(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.bancosMexico.filter(banco => banco.toLowerCase().includes(filterValue));
    }

    formatCLABE(event: any, index?: number): void {
        const input = event.target;
        const formatted = this._getFormattedValueCLABE(input.value);

        input.value = formatted;
        if (index !== undefined) {
            this.proveedoresRows.at(index).get('clabe').setValue(formatted, { emitEvent: false });
        } else {
            // Root clabe (deprecated)
            this.solicitudForm.get('clabe')?.setValue(formatted, { emitEvent: false });
        }
    }

    private _getFormattedValueCLABE(value: string): string {
        if (!value) return '';
        let cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length > 18) cleanValue = cleanValue.substring(0, 18);

        let formatted = '';
        if (cleanValue.length > 0) {
            formatted += cleanValue.substring(0, 3);
            if (cleanValue.length > 3) {
                formatted += '-' + cleanValue.substring(3, 6);
                if (cleanValue.length > 6) {
                    formatted += '-' + cleanValue.substring(6, 17);
                    if (cleanValue.length > 17) {
                        formatted += '-' + cleanValue.substring(17, 18);
                    }
                }
            }
        }
        return formatted;
    }

    private _setupCalculationListener(): void {
        this.detalles.valueChanges.pipe(
            debounceTime(100),
            takeUntil(this._unsubscribeAll)
        ).subscribe((values: any[]) => {
            this._calcularTotales(values);
        });

        this.solicitudForm.get('isrRetenido')?.valueChanges.pipe(
            debounceTime(100),
            takeUntil(this._unsubscribeAll)
        ).subscribe(() => {
            this._calcularTotales(this.detalles.value);
        });

        this.solicitudForm.get('descuento')?.valueChanges.pipe(
            debounceTime(100),
            takeUntil(this._unsubscribeAll)
        ).subscribe(() => {
            this._calcularTotales(this.detalles.value);
        });
    }

    private _calcularTotales(values: any[]): void {
        let subtotal = 0;
        let totalPiezas = 0;

        (values || []).forEach((curr, i) => {
            const cantidad = parseFloat(curr.cantidad) || 0;
            const monto = parseFloat(curr.monto) || 0;
            const subtotalLinea = Number((cantidad * monto).toFixed(4));
            const ivaLinea = Number((subtotalLinea * 0.16).toFixed(4));

            subtotal += subtotalLinea;
            totalPiezas += cantidad;

            const currentIva = Number(curr.iva || 0).toFixed(2);
            const calcIva = ivaLinea.toFixed(2);
            if (currentIva !== calcIva) {
                this.detalles.at(i).patchValue({ iva: ivaLinea }, { emitEvent: false });
            }
        });

        const isrRetenido = parseFloat(this.solicitudForm.get('isrRetenido')?.value) || 0;
        const descuento = parseFloat(this.solicitudForm.get('descuento')?.value) || 0;

        if (values.length > 0) {
            subtotal = Number(subtotal.toFixed(2));
            const subtotalConDescuento = Math.max(0, Number((subtotal - descuento).toFixed(2)));
            const iva = Number((subtotalConDescuento * 0.16).toFixed(2));
            const total = Number((subtotalConDescuento + iva - isrRetenido).toFixed(2));

            this.solicitudForm.patchValue({
                subtotal: subtotal,
                iva: iva,
                monto: total > 0 ? total : 0,
                totalPiezas: totalPiezas
            }, { emitEvent: false });
        } else {
            this.solicitudForm.patchValue({
                subtotal: 0,
                iva: 0,
                monto: 0,
                totalPiezas: 0
            }, { emitEvent: false });
        }
    }

    private _setupProductSearch(index: number): void {
        const control = this.detalles.at(index).get('materialServicio');
        this.filteredProducts$[index] = control.valueChanges.pipe(
            debounceTime(500),
            switchMap(value => {
                if (typeof value === 'string' && value.trim().length >= 2) {
                    return this._solicitudCompraService.consultarExistenciaContpaqi(value.trim())
                        .pipe(catchError(() => of([] as ProductoBuscadorDto[])));
                }
                return of([] as ProductoBuscadorDto[]);
            }),
            shareReplay(1)
        );
    }

    displayFn(value: any): string {
        if (value && typeof value === 'object') {
            return value.nombreProducto || value.codigoProducto || '';
        }
        return value || '';
    }

    onProductSelected(event: any, index: number): void {
        const product = event.option.value as ProductoBuscadorDto;
        const detailGroup = this.detalles.at(index);

        detailGroup.patchValue({
            materialServicio: product.nombreProducto,
            descripcionEspecificacion: `${product.codigoProducto} - ${product.nombreProducto}`,
            unidad: product.unidadMedida
        }, { emitEvent: false });

        setTimeout(() => {
            detailGroup.get('materialServicio').setValue(product.nombreProducto, { emitEvent: false });
            const rowElements = document.querySelectorAll('tbody tr');
            if (rowElements[index]) {
                const quantityInput = rowElements[index].querySelector('input[formControlName="cantidad"]') as HTMLInputElement;
                if (quantityInput) {
                    quantityInput.focus();
                    quantityInput.select();
                }
            }
        });
    }

    onPasteMaterials(event: ClipboardEvent, index: number, field: string): void {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return;
        const pastedText = clipboardData.getData('text');
        if (!pastedText) return;
        const lines = pastedText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) return;
        event.preventDefault();
        lines.forEach((line, i) => {
            const currentIndex = index + i;
            if (currentIndex >= this.detalles.length) this.addDetalle();
            this.detalles.at(currentIndex).get(field).setValue(line.trim());
        });
    }

    removeDetalle(index: number): void {
        this.detalles.removeAt(index);
        this.filteredProducts$.splice(index, 1);
    }

    loadSolicitud(id: number): void {
        this._solicitudCompraService.getPorId(id).subscribe(solicitud => {
            this.anticipos = solicitud.anticipos || [];
            this.solicitudForm.patchValue(solicitud);
            // CLABE formatting is now handled per provider row

            // Load Providers
            while (this.proveedoresRows.length) this.proveedoresRows.removeAt(0);
            this.filteredProveedoresRows$ = [];

            if (solicitud.proveedores && solicitud.proveedores.length > 0) {
                solicitud.proveedores.forEach((p, i) => {
                    const row = this._formBuilder.group({
                        idSolicitudProveedor: [p.idSolicitudProveedor],
                        razonSocial: [p.razonSocial, Validators.required],
                        rfc: [p.rfc],
                        banco: [p.banco],
                        cuenta: [p.cuenta],
                        clabe: [p.clabe],
                        regimenFiscal: [p.regimenFiscal || ''],
                        usoCfdi: [p.usoCfdi || ''],
                        esSeleccionado: [p.esSeleccionado],
                        comentarios: [p.comentarios]
                    });
                    this.proveedoresRows.push(row);
                    this._setupProveedorFilterForRow(i);
                });
            } else if (this.isEdit) {
                // Handle legacy data or just add one empty
                this.addProveedor();
                // Map legacy data to first row if it exists in root
                const legacyP = solicitud as any;
                if (legacyP.razonSocial) {
                    this.proveedoresRows.at(0).patchValue({
                        razonSocial: legacyP.razonSocial,
                        rfc: legacyP.rfc,
                        banco: legacyP.banco,
                        cuenta: legacyP.cuenta,
                        clabe: legacyP.clabe,
                        esSeleccionado: true
                    });
                }
            }
            while (this.detalles.length) this.detalles.removeAt(0);
            this.filteredProducts$ = [];
            solicitud.detalles.forEach(d => {
                const cantidad = d.cantidad || 0;
                const monto = d.monto || 0;
                let precioUnitario = 0;
                if (cantidad > 0) precioUnitario = monto / cantidad;
                else if (monto > 0) precioUnitario = monto;

                const detalleForm = this._formBuilder.group({
                    idDetalle: [d.idDetalle],
                    partida: [d.partida],
                    materialServicio: [d.materialServicio],
                    descripcionEspecificacion: [d.descripcionEspecificacion],
                    cantidad: [d.cantidad, [Validators.required, Validators.min(0.01)]],
                    unidad: [d.unidad, Validators.required],
                    observaciones: [d.observaciones],
                    monto: [d.monto || 0, [Validators.required, Validators.min(0.01)]],
                    iva: [(d.monto || 0) * (d.cantidad || 0) * 0.16]
                });
                this.detalles.push(detalleForm);
            });
            this.detalles.controls.forEach((_, i) => this._setupProductSearch(i));
            this.loadArchivos(id);
        });
    }

    aprobarSolicitud(): void {
        if (!this.isEdit || !this.solicitudId) {
            this._chatNotificationService.showWarning('Atención', 'La solicitud debe estar guardada antes de ser aprobada.');
            return;
        }

        const idUsuario = this.currentUserId;

        Swal.fire({
            title: '¿Aprobar solicitud?',
            text: 'Esta acción notificará al solicitante y bloqueará cambios adicionales de aprobación.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._solicitudCompraService.aprobarCheck(this.solicitudId, idUsuario).subscribe({
                    next: () => {
                        this._chatNotificationService.showSuccess('Éxito', 'Solicitud aprobada. Se ha notificado al solicitante.');
                        this.solicitudForm.patchValue({
                            esAprobada: true,
                            fechaAprobacion: new Date()
                        });
                    },
                    error: (err) => {
                        console.error('Error aprobando solicitud:', err);
                        const msg = err.error?.message || err.message || 'Error al aprobar la solicitud';
                        this._chatNotificationService.showError('Error', msg);
                    }
                });
            }
        });
    }

    aprobarCredito(): void {
        if (!this.isEdit || !this.solicitudId) {
            this._chatNotificationService.showWarning('Atención', 'La solicitud debe estar guardada antes de aprobar el crédito.');
            return;
        }

        const idUsuario = this.currentUserId;

        Swal.fire({
            title: '¿Aprobar crédito?',
            text: 'Esta acción validará el crédito para esta solicitud.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, aprobar crédito',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._solicitudCompraService.aprobarCredito(this.solicitudId, idUsuario).subscribe({
                    next: () => {
                        this._chatNotificationService.showSuccess('Éxito', 'Crédito aprobado correctamente.');
                        this.solicitudForm.patchValue({
                            esAprobadaCredito: true,
                            fechaAprobacionCredito: new Date()
                        });
                    },
                    error: (err) => {
                        console.error('Error aprobando crédito:', err);
                        const msg = err.error?.message || err.message || 'Error al aprobar el crédito';
                        this._chatNotificationService.showError('Error', msg);
                    }
                });
            }
        });
    }

    openSemaforoInfo(): void {
        Swal.fire({
            title: 'Guía: Semáforo de Compras (ISO 50001 / ISO 9001)',
            html: `
                <div class="flex flex-col gap-3 text-left p-2">
                    <div class="flex gap-3 items-start p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <div class="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold shrink-0">🔴</div>
                        <div>
                            <div class="font-bold text-rose-700">Rojo: Urgente (Mismo día / Vencida)</div>
                            <div class="text-xs text-rose-600/80">Compras que requieren atención inmediata en el día o con fecha comprometida vencida.</div>
                        </div>
                    </div>
                    <div class="flex gap-3 items-start p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <div class="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold shrink-0">🟡</div>
                        <div>
                            <div class="font-bold text-amber-700">Amarillo: Medio (Planeado 1 a 3 días)</div>
                            <div class="text-xs text-amber-600/80">Compras de margen moderado programadas a corto plazo (1 a 3 días hábiles).</div>
                        </div>
                    </div>
                    <div class="flex gap-3 items-start p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div class="w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center text-white font-bold shrink-0">🟢</div>
                        <div>
                            <div class="font-bold text-emerald-700">Verde: Programado (> 3 días)</div>
                            <div class="text-xs text-emerald-600/80">Compras con tiempo holgado y suficiente margen de gestión anticipada.</div>
                        </div>
                    </div>
                    <div class="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-200">
                        ℹ️ <b>Dinamismo automático:</b> El semáforo se calcula en función de la Fecha Requerida, pero puedes forzarlo a Rojo manualmente si la operación lo requiere.
                    </div>
                </div>
            `,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#2c7c6e',
            customClass: {
                container: 'z-[99999]'
            }
        });
    }

    loadArchivos(id: number): void {
        this._solicitudCompraService.getArchivos(id).subscribe(archivos => {
            if (Array.isArray(archivos)) {
                this.archivos = archivos.map(nombre => ({ nombreArchivo: nombre }));
            } else {
                this.archivos = [];
            }
        });
    }

    descargarArchivo(nombreArchivo: string, preview: boolean = false): void {
        this._solicitudCompraService.descargarArchivo(this.solicitudId, nombreArchivo).subscribe(async (response: Blob) => {
            const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
            const isPdf = extension === 'pdf';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);

            if (preview && (isPdf || isImage)) {
                let fileData: any;
                if (isPdf) {
                    const arrayBuffer = await response.arrayBuffer();
                    fileData = new Uint8Array(arrayBuffer);
                    this._openPreviewDialog(fileData, nombreArchivo, true);
                } else {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        fileData = e.target.result;
                        this._openPreviewDialog(fileData, nombreArchivo, false);
                    };
                    reader.readAsDataURL(response);
                }
            } else {
                const objectUrl = URL.createObjectURL(response);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = nombreArchivo;
                a.click();
                URL.revokeObjectURL(objectUrl);
            }
        });
    }

    private _openPreviewDialog(url: any, name: string, isPdf: boolean): void {
        this._dialog.open(ImagePreviewDialogComponent, {
            data: {
                url: url,
                name: name,
                isPdf: isPdf
            },
            panelClass: 'bg-transparent',
            maxWidth: isPdf ? '95vw' : '90vw',
            width: isPdf ? '1100px' : 'auto',
            backdropClass: ['bg-black', 'bg-opacity-80']
        });
    }

    eliminarArchivo(nombreArchivo: string): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará el archivo ${nombreArchivo} permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._solicitudCompraService.eliminarArchivo(this.solicitudId, nombreArchivo).subscribe(() => {
                    this._chatNotificationService.showSuccess('Éxito', 'Archivo eliminado correctamente');
                    this.loadArchivos(this.solicitudId);
                });
            }
        });
    }

    onFileSelected(event: any): void {
        const files = event.target.files;
        if (files) {
            this.selectedFiles.push(...Array.from(files) as File[]);
            event.target.value = '';
        }
    }

    removeSelectedFile(index: number): void {
        this.selectedFiles.splice(index, 1);
    }

    save(): void {
        if (this.isSaving) return;

        this.solicitudForm.markAllAsTouched();
        if (this.solicitudForm.invalid) {
            const invalidFields = [];
            const controls = this.solicitudForm.controls;
            const fieldNames: any = {
                sucursal: 'Sucursal',
                areaSolicitante: 'Área Solicitante',
                prioridad: 'Prioridad',
                tipoCompra: 'Tipo de Compra',
                centroCosto: 'Centro de Costo',
                moneda: 'Moneda',
                formaPago: 'Forma de Pago',
                razonSocial: 'Razón Social',
                monto: 'Total',
                cuadranteId: 'Semáforo de Compra',
                detalles: 'Partidas (Detalle de materiales)'
            };
            for (const name in controls) {
                if (name !== 'detalles' && controls[name].invalid) invalidFields.push(fieldNames[name] || name);
            }
            if (this.detalles.length === 0) {
                invalidFields.push('Es obligatorio agregar al menos un material (partida) para crear la solicitud');
            } else {
                this.detalles.controls.forEach((group: FormGroup, i) => {
                    if (group.invalid) invalidFields.push(`Error en partida #${i + 1}`);
                });
            }
            const message = `Faltan campos por completar:\n- ${invalidFields.join('\n- ')}`;
            this._chatNotificationService.showWarning('Atención', message);
            const firstInvalidControl = document.querySelector('.mat-form-field-invalid');
            if (firstInvalidControl) firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        this.isSaving = true;

        const data = {
            ...this.solicitudForm.value,
            // Un campo numérico vacío da null y la columna Descuento no admite NULL: sin descuento es 0
            descuento: Number(this.solicitudForm.value.descuento) || 0,
            IdUsuarioLogueado: this.currentUserId
        };

        // Sanitize CLABEs in providers
        if (data.proveedores) {
            data.proveedores.forEach((p: any) => {
                if (p.clabe) p.clabe = p.clabe.replace(/\D/g, '');
            });
        }

        if (this.isEdit) {
            this._solicitudCompraService.actualizar(data).subscribe({
                next: () => {
                    if (this.selectedFiles.length > 0) {
                        const uploads = this.selectedFiles.map(file => this._solicitudCompraService.subirArchivo(this.solicitudId, file));
                        forkJoin(uploads).subscribe({
                            next: () => {
                                this.isSaving = false;
                                this._chatNotificationService.showSuccess('Éxito', 'Solicitud actualizada correctamente con nuevos archivos');
                                this._router.navigate(['../../'], { relativeTo: this._route });
                            },
                            error: (err) => {
                                this.isSaving = false;
                                console.error('Error uploading files:', err);
                                this._chatNotificationService.showError('Error', 'La solicitud se guardó pero hubo un error al subir algunos archivos');
                                this._router.navigate(['../../'], { relativeTo: this._route });
                            }
                        });
                    } else {
                        this.isSaving = false;
                        this._chatNotificationService.showSuccess('Éxito', 'Solicitud actualizada correctamente');
                        this._router.navigate(['../../'], { relativeTo: this._route });
                    }
                },
                error: (err) => {
                    this.isSaving = false;
                    console.error('Error updating:', err);
                    const msg = err.error?.message || err.message || 'Error interno del servidor';
                    this._chatNotificationService.showError('Error al actualizar', msg);
                }
            });
        } else {
            this._solicitudCompraService.crear(data).subscribe({
                next: (response) => {
                    const newId = response.idSolicitud || response.id;
                    if (this.selectedFiles.length > 0 && newId) {
                        const uploads = this.selectedFiles.map(file => this._solicitudCompraService.subirArchivo(newId, file));
                        forkJoin(uploads).subscribe({
                            next: () => {
                                this.isSaving = false;
                                this._chatNotificationService.showSuccess('Éxito', 'Solicitud y archivos guardados correctamente');
                                this._router.navigate(['../'], { relativeTo: this._route });
                            },
                            error: (err) => {
                                this.isSaving = false;
                                console.error('Error uploading files:', err);
                                this._chatNotificationService.showError('Error', 'La solicitud se creó pero hubo un error al subir algunos archivos');
                                this._router.navigate(['../'], { relativeTo: this._route });
                            }
                        });
                    } else {
                        this.isSaving = false;
                        this._chatNotificationService.showSuccess('Éxito', 'Solicitud de compra guardada correctamente');
                        this._router.navigate(['../'], { relativeTo: this._route });
                    }
                },
                error: (err) => {
                    this.isSaving = false;
                    console.error('Error creating:', err);
                    const msg = err.error?.message || err.message || 'Error interno del servidor';
                    this._chatNotificationService.showError('Error al crear', msg);
                }
            });
        }
    }

    cancelar(): void {
        const path = this.isEdit ? '../../' : '../';
        this._router.navigate([path], { relativeTo: this._route });
    }

    importarDesdeContpaqi(): void {
        const folio = this.solicitudForm.get('folioOC').value;
        if (!folio || folio.trim() === '') {
            this._snackBar.open('Debes ingresar un Folio OC para buscar materiales', 'Cerrar', { duration: 3000 });
            return;
        }
        this._snackBar.open('Buscando materiales en CONTPAQi...', 'Cerrar', { duration: 2000 });
        this._solicitudCompraService.obtenerDetalleMateriales(folio).subscribe({
            next: (materiales) => {
                if (!materiales || materiales.length === 0) {
                    this._snackBar.open('No se encontraron materiales para el Folio OC ingresado', 'Cerrar', { duration: 4000 });
                    return;
                }
                const dialogRef = this._dialog.open(ImportarMaterialesDialogComponent, {
                    data: { materiales: materiales, folio: folio },
                    width: '900px',
                    disableClose: true
                });
                dialogRef.afterClosed().subscribe((materialesSeleccionados: ContpaqiMaterialDto[]) => {
                    if (materialesSeleccionados && materialesSeleccionados.length > 0) {
                        this._procesarMaterialesImportados(materialesSeleccionados);
                    }
                });
            },
            error: (err) => {
                console.error('Error al importar materiales:', err);
                this._snackBar.open('Error al conectar con CONTPAQi. Verifica el Folio OC.', 'Cerrar', { duration: 5000 });
            }
        });
    }

    onPdfFileSelected(event: any): void {
        const file = event.target.files[0];
        if (!file) return;
        this._snackBar.open('Procesando PDF...', 'Cerrar', { duration: 2000 });
        LectorPdfMateriales.leer(file).then(materiales => {
            if (!materiales || materiales.length === 0) {
                this._snackBar.open('No se detectaron tablas de materiales legibles en el PDF', 'Cerrar', { duration: 4000 });
                return;
            }
            const dialogRef = this._dialog.open(ImportarMaterialesDialogComponent, {
                data: { materiales: materiales, folio: 'PDF Importado' },
                width: '1000px',
                disableClose: true
            });
            dialogRef.afterClosed().subscribe((materialesSeleccionados: ContpaqiMaterialDto[]) => {
                if (materialesSeleccionados && materialesSeleccionados.length > 0) {
                    this._procesarMaterialesImportados(materialesSeleccionados);
                }
            });
        }).catch(err => {
            console.error('Error parsing PDF:', err);
            this._snackBar.open('Error al procesar el archivo PDF', 'Cerrar', { duration: 5000 });
        });
        event.target.value = '';
    }

    private _procesarMaterialesImportados(materiales: ContpaqiMaterialDto[]): void {
        if (this.detalles.length > 0) {
            Swal.fire({
                title: 'Importar Materiales',
                text: '¿Deseas sobrescribir los materiales actuales o agregarlos al final?',
                icon: 'question',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: 'Agregar al final',
                denyButtonText: 'Sobrescribir',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) this._insertarMateriales(materiales, false);
                else if (result.isDenied) this._insertarMateriales(materiales, true);
            });
        } else this._insertarMateriales(materiales, true);
    }

    private _insertarMateriales(materiales: ContpaqiMaterialDto[], sobrescribir: boolean): void {
        if (sobrescribir) {
            while (this.detalles.length) this.detalles.removeAt(0);
            this.filteredProducts$ = [];
        }
        materiales.forEach((m) => {
            const index = this.detalles.length;
            const unidadNormalizada = LectorPdfMateriales.normalizeUnidad(m.unidad);
            const detalleForm = this._formBuilder.group({
                idDetalle: [0],
                partida: [index + 1],
                materialServicio: [m.materialServicio, Validators.required],
                descripcionEspecificacion: [m.descripcion || m.materialServicio],
                cantidad: [m.cantidad, [Validators.required, Validators.min(0.01)]],
                unidad: [unidadNormalizada, Validators.required],
                observaciones: ['Importado de PDF'],
                monto: [m.costoUnitario, [Validators.required, Validators.min(0)]],
                iva: [m.iva]
            });
            this.detalles.push(detalleForm);
            this._setupProductSearch(index);
        });
        this._chatNotificationService.showSuccess('Éxito', `${materiales.length} materiales importados correctamente`);
    }
}
