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
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { SolicitudCompraCreateDto, ProductoBuscadorDto, ProveedorDto, ContpaqiMaterialDto } from '../models/solicitud-compra.types';
import { ImportarMaterialesDialogComponent } from './importar-materiales-dialog/importar-materiales-dialog.component';
import { ClientsService } from '../../../catalogs/clients/clients.service';
import { catchError, debounceTime, distinctUntilChanged, filter, forkJoin, map, Observable, of, shareReplay, startWith, switchMap, takeUntil, Subject } from 'rxjs';
import { UsersService } from '../../../security/users/users.service';
import Swal from 'sweetalert2';
import * as pdfjsLib from 'pdfjs-dist';

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
        MatSnackBarModule
    ]
})
export class SolicitudCompraFormComponent implements OnInit {
    solicitudForm: FormGroup;
    isEdit: boolean = false;
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

    // Select options
    prioridades = ['Urgente', 'Alta', 'Normal'];
    tiposCompra = ['Material para proyecto', 'Inventario almacén', 'Herramienta', 'Consumible', 'Servicio', 'VENTA CONFIRMADA'];
    centrosCosto = ['Proyecto específico', 'Operación sucursal', 'Administración'];
    areas = ['Proyectos', 'Almacén', 'Ventas', 'Administración', 'Marketing', 'RH'];
    formasPago = ['CONTADO (PUE)', 'CREDITO (PPD)'];
    razonesSociales = ['Jesus Ricardo Mendez Arrillaga', 'JR Ingenieria Electrica'];
    cuadrantes = [
        { id: 1, nombre: 'Hacer (Urg. / Imp.)' },
        { id: 2, nombre: 'Planificar (No Urg. / Imp.)' },
        { id: 3, nombre: 'Delegar (Urg. / No Imp.)' },
        { id: 4, nombre: 'Eliminar (No Urg. / No Imp.)' }
    ];
    sucursales: any[] = [];
    usuarios: any[] = [];
    aprobadores: any[] = [];
    
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
            const allowedApproverIds = [14, 13, 16, 6, 12, 43, 18, 9];
            this.aprobadores = this.usuarios.filter(user => 
                allowedApproverIds.includes(user.usuarioId || user.id)
            );
        });
    }

    loadProjects(): void {
        this._projectService.getProjects().subscribe((response: any) => {
            this.proyectos = response?.data || response || [];
            this._setupProjectFilter();
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
            moneda: ['MXN', Validators.required],
            formaPago: ['', Validators.required],
            razonSocial: ['', Validators.required], // Internal company
            monto: [0, [Validators.required, Validators.min(0.01)]],
            subtotal: [0],
            iva: [0],
            totalPiezas: [0],
            cuadranteId: [null, Validators.required],
            detalles: this._formBuilder.array([]), // Removed required validator
            proveedores: this._formBuilder.array([])
        });

        // Initialize with at least one supplier row if not editing
        if (!this.isEdit) {
            this.addProveedor();
        }

        this._setupCalculationListener();
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
        
        row.patchValue({
            razonSocial: proveedor.nombre,
            rfc: proveedor.rfc,
            banco: proveedor.banco || '',
            cuenta: proveedor.cuenta || '',
            clabe: proveedor.clabe || ''
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
            String(p.proyectoId || p.id).toLowerCase().includes(filterValue) ||
            String(p.nombre || p.nombreProyecto).toLowerCase().includes(filterValue)
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
        const projectLabel = `${project.proyectoId || project.id} - ${project.nombre || project.nombreProyecto}`;
        const clientLabel = project.nombreCliente || project.cliente || project.clienteNombre || '';
        
        this.solicitudForm.patchValue({
            folioProyecto: projectLabel,
            cliente: clientLabel || project.nombre || project.nombreProyecto
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

            if (values.length > 0) {
                subtotal = Number(subtotal.toFixed(2));
                const iva = Number((subtotal * 0.16).toFixed(2));
                const total = Number((subtotal + iva).toFixed(2));

                this.solicitudForm.patchValue({
                    subtotal: subtotal,
                    iva: iva,
                    monto: total,
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
        });
    }

    private _setupProductSearch(index: number): void {
        const control = this.detalles.at(index).get('materialServicio');
        this.filteredProducts$[index] = control.valueChanges.pipe(
            debounceTime(500),
            switchMap(value => {
                if (typeof value === 'string' && value.trim().length >= 2) {
                    const sucursal = this.solicitudForm.get('sucursal').value || '';
                    let almacen = sucursal.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                    if (sucursal.toLowerCase().includes('hidalgo')) almacen = 'SANTA JULIA';

                    return this._solicitudCompraService.consultarExistenciaContpaqi(value.trim(), almacen)
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
                        // El checkbox se controla por el valor de esAprobada, que no cambió si hubo error
                    }
                });
            }
        });
    }

    loadArchivos(id: number): void {
        this._solicitudCompraService.getArchivos(id).subscribe(response => {
            if (response && response.success && Array.isArray(response.archivos)) {
                this.archivos = response.archivos.map(nombre => ({ nombreArchivo: nombre }));
            } else {
                this.archivos = [];
            }
        });
    }

    descargarArchivo(nombreArchivo: string): void {
        this._solicitudCompraService.descargarArchivo(this.solicitudId, nombreArchivo).subscribe((response: Blob) => {
            const a = document.createElement('a');
            const objectUrl = URL.createObjectURL(response);
            a.href = objectUrl;
            a.download = nombreArchivo;
            a.click();
            URL.revokeObjectURL(objectUrl);
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
                cuadranteId: 'Matriz Eisenhower',
                detalles: 'Partidas (Detalle de materiales)'
            };
            for (const name in controls) {
                if (name !== 'detalles' && controls[name].invalid) invalidFields.push(fieldNames[name] || name);
            }
            if (this.detalles.length === 0) {
                 invalidFields.push('Es obligatorio agregar al menos un material (partida) para crear la solicitud');
            } else {
                this.detalles.controls.forEach((group: FormGroup, i) => {
                    if (group.invalid) invalidFields.push(`Error en partida #${i+1}`);
                });
            }
            const message = `Faltan campos por completar:\n- ${invalidFields.join('\n- ')}`;
            this._chatNotificationService.showWarning('Atención', message);
            const firstInvalidControl = document.querySelector('.mat-form-field-invalid');
            if (firstInvalidControl) firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const data = { ...this.solicitudForm.value };
        
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
                                this._chatNotificationService.showSuccess('Éxito', 'Solicitud actualizada correctamente con nuevos archivos');
                                this._router.navigate(['../../'], { relativeTo: this._route });
                            },
                            error: (err) => {
                                console.error('Error uploading files:', err);
                                this._chatNotificationService.showError('Error', 'La solicitud se guardó pero hubo un error al subir algunos archivos');
                                this._router.navigate(['../../'], { relativeTo: this._route });
                            }
                        });
                    } else {
                        this._chatNotificationService.showSuccess('Éxito', 'Solicitud actualizada correctamente');
                        this._router.navigate(['../../'], { relativeTo: this._route });
                    }
                },
                error: (err) => {
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
                                this._chatNotificationService.showSuccess('Éxito', 'Solicitud y archivos guardados correctamente');
                                this._router.navigate(['../'], { relativeTo: this._route });
                            },
                            error: (err) => {
                                console.error('Error uploading files:', err);
                                this._chatNotificationService.showError('Error', 'La solicitud se creó pero hubo un error al subir algunos archivos');
                                this._router.navigate(['../'], { relativeTo: this._route });
                            }
                        });
                    } else {
                        this._chatNotificationService.showSuccess('Éxito', 'Solicitud de compra guardada correctamente');
                        this._router.navigate(['../'], { relativeTo: this._route });
                    }
                },
                error: (err) => {
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
        this._parsePdfTable(file).then(materiales => {
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

    private async _parsePdfTable(file: File): Promise<ContpaqiMaterialDto[]> {
//         console.log('--- INICIO UNIVERSAL PDF SCANNER ---');
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const allItems: any[] = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const items = textContent.items.map((item: any) => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width,
                height: item.height,
                page: i
            })).filter(item => item.text.trim() !== '');

            if (items.length > 0) {
                items.sort((a, b) => b.y - a.y || a.x - b.x);
                const mergedItems: any[] = [];
                let current = items[0];
                
                for (let j = 1; j < items.length; j++) {
                    const next = items[j];
                    const yDiff = Math.abs(next.y - current.y);
                    const xDiff = next.x - (current.x + current.width);
                    
                    const threshold = (current.y > 400 || current.text.length < 3) ? 14 : 6;
                    
                    if (yDiff < 2 && xDiff >= -2 && xDiff < threshold) {
                        current.text += ' ' + next.text; // Espacio para evitar pegar palabras
                        current.width += next.width + xDiff;
                    } else {
                        current.text = current.text.trim();
                        if (current.text) mergedItems.push(current);
                        current = next;
                    }
                }
                current.text = current.text.trim();
                if (current.text) mergedItems.push(current);
                allItems.push(...mergedItems);
            }
        }
        
        if (allItems.length === 0) return [];

        // Agrupación por filas con umbral flexible
        const rows: any[][] = [];
        let currentRow: any[] = [];
        const sortedItems = [...allItems].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
        
        sortedItems.forEach((item, index) => {
            if (index === 0) { currentRow.push(item); } 
            else {
                const prev = sortedItems[index - 1];
                if (Math.abs(item.y - prev.y) < 6 && item.page === prev.page) { currentRow.push(item); } 
                else {
                    rows.push(currentRow.sort((a, b) => a.x - b.x));
                    currentRow = [item];
                }
            }
        });
        if (currentRow.length > 0) rows.push(currentRow.sort((a, b) => a.x - b.x));

        // IDENTIFICACIÓN DE COLUMNAS CON RESTRICCIONES LÓGICAS
        const columnMapping: any = { articulo: -1, nombre: -1, unidad: -1, cantidad: -1, precio: -1, total: -1 };
        const KEYWORDS: any = {
            articulo: ['ARTICULO', 'ARTÍCULO', 'CODIGO', 'CÓDIGO', 'PARTIDA', 'REF', 'CLAVE', 'SKU', 'ID'],
            nombre: ['NOMBRE', 'DESCRIPCION', 'DESCRIPCIÓN', 'CONCEPTO', 'DETALLE', 'PRODUCTO', 'ESPECIFICACIÓN', 'DESCRIPCION DEL ARTICULO'],
            unidad: ['UNIDAD', 'U.MED', 'U.M', 'UM', 'MEDIDA', 'U M', 'UNID', 'UNIT', 'PRESENTACION', 'U/M', 'UNID. MEDIDA'],
            cantidad: ['CANTIDAD', 'UNIDADES', 'CANT', 'QTY', 'PIEZAS', 'PZAS'],
            precio: ['PRECIO', 'COSTO', 'UNITARIO', 'P.U.', 'P.UNIT', 'PREC. NE.', 'VALOR UNITARIO', 'PRECIO NE.'],
            total: ['TOTAL', 'IMPORTE', 'EXTENSIÓN', 'EXTENSION', 'SUBTOTAL', 'SUB TOTAL', 'MONTO', 'NETO', 'TOTAL LINEA']
        };

        const FOOTER_KEYWORDS = ['SUBTOTAL', 'I.V.A', 'IVA', 'TOTAL', 'NETO', 'CONDICIONES', 'ESTIMADO CLIENTE', 'VIGENCIA', 'EXISTENCIA GRUPAL', 'COMPRA MINIMA', 'SUJETOS A CAMBIOS'];

        let foundHeaderRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 30); i++) {
            const rowText = rows[i].map(item => item.text.toUpperCase());
            let matches = 0;
            const tempMapping: any = { articulo: -1, nombre: -1, unidad: -1, cantidad: -1, precio: -1, total: -1 };

            for (const key in KEYWORDS) {
                const foundIndex = rowText.findIndex(text => KEYWORDS[key].some((k: string) => text.includes(k) || k.includes(text)));
                if (foundIndex !== -1) {
                    tempMapping[key] = rows[i][foundIndex].x;
                    matches++;
                }
            }
            
            // VALIDACIÓN LÓGICA: Artículo < Nombre < Cantidad < Precio < Total
            const hasEssential = tempMapping.nombre !== -1 && (tempMapping.cantidad !== -1 || tempMapping.total !== -1);
            if (matches >= 2 && hasEssential) {
                // Verificar orden lógico básico
                const isOrdered = (tempMapping.articulo === -1 || tempMapping.articulo < tempMapping.nombre) &&
                                  (tempMapping.articulo === -1 || tempMapping.articulo < tempMapping.cantidad) &&
                                  (tempMapping.nombre < tempMapping.cantidad || tempMapping.cantidad === -1) &&
                                  (tempMapping.cantidad < tempMapping.total || tempMapping.cantidad === -1 || tempMapping.total === -1);
                
                if (isOrdered) {
                    Object.assign(columnMapping, tempMapping);
                    foundHeaderRowIndex = i;
//                     console.log(`CABECERA UNIVERSAL VALIDADA (Fila ${i}):`, rowText.join(' | '));
                    break;
                }
            }
        }

//         console.log('MAPEO FINAL UNIVERSAL:', columnMapping);

        // EXTRACCIÓN CON FILTRADO DE PIE DE PÁGINA
        const detectedMateriales: ContpaqiMaterialDto[] = [];
        const hasMapping = columnMapping.nombre !== -1 && (columnMapping.cantidad !== -1 || columnMapping.total !== -1);

        for (let i = foundHeaderRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const rowTextStr = row.map(it => it.text.toUpperCase()).join(' ');

            // 1. Detección de Pie de Página o Metadatos
            if (FOOTER_KEYWORDS.some(key => rowTextStr.includes(key))) {
//                 console.log('Fila de metadatos/pie detectada y saltada:', rowTextStr);
                continue;
            }

            let material = '';
            let descripcion = '';
            let unidadStr = '';
            let cantidad = 0;
            let costo = 0;
            let total = 0;

            if (hasMapping) {
                row.forEach(item => {
                    const closest = this._getClosestColumn(item.x, columnMapping);
                    const text = item.text.trim();
                    switch(closest) {
                        case 'articulo': material = text; break;
                        case 'nombre': descripcion = text; break;
                        case 'unidad': unidadStr = text; break;
                        case 'cantidad': cantidad = this._parseNumber(text); break;
                        case 'precio': costo = this._parseNumber(text); break;
                        case 'total': total = this._parseNumber(text); break;
                    }
                });
            }

            // Limpieza de código de artículo (Remover índice numeral inicial)
            if (material) {
                material = material.replace(/^\d+[\s.-]+/, '').trim();
            }

            // Normalización
            if (!material && descripcion) material = descripcion;
            if (!descripcion && material) descripcion = material;

            // Soporte multi-línea (Solo si está en la zona de descripción)
            const isJustText = (descripcion || material) && cantidad === 0 && costo === 0 && total === 0;
            if (isJustText && detectedMateriales.length > 0) {
                const isNameArea = row.some(it => this._getClosestColumn(it.x, columnMapping) === 'nombre');
                if (isNameArea) {
                    const lastIdx = detectedMateriales.length - 1;
                    detectedMateriales[lastIdx].descripcion += ' ' + row.map(it => it.text).join(' ');
                    continue;
                }
            }

            // Validación de fila de datos real: debe tener al menos un nombre y un valor numérico relevante
            if ((material || descripcion) && (cantidad > 0 || costo > 0 || total > 0)) {
                // Prevenir que el material sea solo un número (posible desalineación con precio)
                if (this._isNumeric(material) && material.length < 10 && costo > 0) {
                    material = descripcion.substring(0, 50);
                }

                const finalCant = cantidad || (total > 0 && costo > 0 ? (total / costo) : 1);
                const finalCosto = costo || (total > 0 && cantidad > 0 ? (total / cantidad) : total);
                const finalTotal = total || (cantidad * costo) || 0;

                detectedMateriales.push({
                    materialServicio: (material || descripcion).substring(0, 75),
                    descripcion: descripcion || material,
                    unidad: this._normalizeUnidad(unidadStr || 'PZA'),
                    cantidad: Math.round((finalCant + Number.EPSILON) * 10000) / 10000,
                    costoUnitario: Math.round((finalCosto + Number.EPSILON) * 100) / 100,
                    iva: 0,
                    total: Math.round((finalTotal + Number.EPSILON) * 100) / 100
                });
            }
        }

//         console.log(`EXTRACCIÓN FINALIZADA: ${detectedMateriales.length} artículos.`);
        return detectedMateriales;
    }

    private _getClosestColumn(x: number, mapping: any): string {
        let minDiff = Infinity;
        let closestKey = '';
        for (const key in mapping) {
            if (mapping[key] === -1) continue;
            const diff = Math.abs(x - mapping[key]);
            // Priorizamos la columna que esté a la derecha o muy cerca a la izquierda
            if (diff < minDiff && diff < 120) { 
                minDiff = diff; closestKey = key; 
            }
        }
        return closestKey;
    }

    private _isNumeric(val: string): boolean {
        // Mejorado para detectar el formato de miles y moneda
        const clean = val.replace(/[$,\s]/g, '');
        return !isNaN(parseFloat(clean)) && isFinite(Number(clean)) && clean !== '';
    }

    private _parseNumber(val: string): number {
        if (!val) return 0;
        // Quitar símbolos de moneda, comas y espacios. 
        // Manejar caso especial de comas como separadores de decimales vs miles
        let clean = val.replace(/[$\s]/g, '');
        // Si hay una coma y un punto, asumimos formato americano (1,234.56)
        if (clean.includes(',') && clean.includes('.')) {
            clean = clean.replace(/,/g, '');
        } else if (clean.includes(',') && !clean.includes('.')) {
            // Si solo hay coma, podría ser decimal (12,34) o miles (1,234)
            // Heurística: si hay exactamente 3 dígitos después, es miles.
            const parts = clean.split(',');
            if (parts[parts.length-1].length === 3) {
                clean = clean.replace(/,/g, '');
            } else {
                clean = clean.replace(/,/g, '.');
            }
        }
        return parseFloat(clean) || 0;
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
            const unidadNormalizada = this._normalizeUnidad(m.unidad);
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

    private _normalizeUnidad(u: string): string {
        if (!u) return 'PZA';
        const unit = u.trim().toUpperCase()
            .replace(/[.]/g, '') // Quitar puntos para normalizar (P.Z.A -> PZA)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Quitar acentos

        // Mapeo extenso de variaciones
        if (['PIEZA', 'PZ', 'PZA', 'PIEZAS', 'PZAS', 'PC', 'PCS', 'PIECE', 'EA', 'EACH'].includes(unit)) return 'PZA';
        if (['SERVICIO', 'SER', 'SERV', 'SERVICIOS', 'SERVICE', 'SRV'].includes(unit)) return 'SERVICIO';
        if (['CAJA', 'CJ', 'CJA', 'CAJAS', 'BOX', 'BX', 'CJAS'].includes(unit)) return 'CAJA';
        if (['METRO', 'M', 'MT', 'MTS', 'METROS', 'METER', 'ML', 'METRO LINEAL'].includes(unit)) return 'METRO';
        if (['KILO', 'KG', 'KGS', 'KILOS', 'KILOGRAMO', 'KILOGRAMOS'].includes(unit)) return 'KILO';
        if (['LOTE', 'LT', 'LOT', 'LOTES', 'JOB'].includes(unit)) return 'LOTE';
        if (['PAQUETE', 'PQT', 'PQ', 'PK', 'PKG', 'PAQ'].includes(unit)) return 'PAQUETE';
        if (['PAR', 'PR', 'PARES'].includes(unit)) return 'PAR';
        if (['ROLLO', 'RL', 'ROLLOS', 'ROLL'].includes(unit)) return 'ROLLO';
        if (['LITRO', 'LTR', 'LTS', 'L', 'LITROS'].includes(unit)) return 'LITRO';
        if (['BOTE', 'BT', 'BOTES'].includes(unit)) return 'BOTE';
        if (['BOLSA', 'BLS', 'BAG'].includes(unit)) return 'BOLSA';
        if (['TRAMO', 'TR', 'TRAMOS'].includes(unit)) return 'TRAMO';
        if (['BARRA', 'BR', 'BARRAS'].includes(unit)) return 'BARRA';
        if (['PLIEGO', 'PLG'].includes(unit)) return 'PLIEGO';
        if (['JUEGO', 'JG', 'JGO', 'JUEGOS', 'SET'].includes(unit)) return 'JUEGO';
        if (['TAMBO', 'TB', 'DRUM'].includes(unit)) return 'TAMBO';
        
        // Si no se encuentra en la lista, retornar PZA por defecto pero conservar valor si es razonable
        return unit.length <= 10 ? unit : 'PZA';
    }
}
