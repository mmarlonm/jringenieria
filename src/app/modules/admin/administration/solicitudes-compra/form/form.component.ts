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
import { SolicitudCompraService } from '../solicitud-compra.service';
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { SolicitudCompraCreateDto, ProductoBuscadorDto, ProveedorDto } from '../models/solicitud-compra.types';
import { catchError, debounceTime, distinctUntilChanged, filter, forkJoin, map, Observable, of, shareReplay, startWith, switchMap, takeUntil, Subject } from 'rxjs';
import { UsersService } from '../../../security/users/users.service';
import Swal from 'sweetalert2';

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
        MatAutocompleteModule
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
    filteredProyectos$: Observable<any[]>;
    filteredProveedores$: Observable<ProveedorDto[]>;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

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
    filteredBancos$: Observable<string[]>;

    constructor(
        private _formBuilder: FormBuilder,
        private _solicitudCompraService: SolicitudCompraService,
        private _projectService: ProjectService,
        private _usersService: UsersService,
        private _chatNotificationService: ChatNotificationService,
        private _route: ActivatedRoute,
        private _router: Router
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadBranches();
        this.loadUsers();
        this.loadProjects();
        this._setupProveedorFilter();
        this._setupBancoFilter();

        this._route.params.subscribe(params => {
            if (params['id']) {
                this.isEdit = true;
                this.solicitudId = +params['id'];
                this.loadSolicitud(this.solicitudId);
            }
        });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    loadUsers(): void {
        this._usersService.getUsers().subscribe(users => {
            this.usuarios = users || [];
        });
    }

    loadProjects(): void {
        this._projectService.getProjects().subscribe((response: any) => {
            // Handle the wrapper { code, message, data: [] }
            this.proyectos = response?.data || response || [];
            this._setupProjectFilter();
        });
    }

    initForm(): void {
        let userId = 1; // Fallback
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = userInformation.usuario || {};
            userId = user.id || user.usuarioId || 1;
        } catch (e) {
            console.error('Error reading user from localStorage', e);
        }

        this.solicitudForm = this._formBuilder.group({
            idSolicitud: [0],
            sucursal: ['', Validators.required],
            areaSolicitante: ['', Validators.required],
            idPersonaSolicitante: [userId],
            proyectoCliente: [''],
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
            razonSocial: ['', Validators.required],
            rfc: [''],
            banco: [''],
            cuenta: [''],
            clabe: [''],
            monto: [0, [Validators.required, Validators.min(0.01)]],
            subtotal: [0],
            iva: [0],
            totalPiezas: [0],
            cuadranteId: [null, Validators.required],
            detalles: this._formBuilder.array([], Validators.required)
        });

        this._setupCalculationListener();
    }

    loadBranches(): void {
        this._projectService.getUnidadesDeNegocio().subscribe(branches => {
            this.sucursales = branches;
            // Add 'Otro' if not present
            if (!this.sucursales.find(s => s.nombre === 'Otro')) {
                this.sucursales.push({ id: 0, nombre: 'Otro' });
            }
        });
    }

    get detalles(): FormArray {
        return this.solicitudForm.get('detalles') as FormArray;
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

    onProjectSelected(event: any): void {
        const project = event.option.value;
        const label = `${project.proyectoId || project.id} - ${project.nombre || project.nombreProyecto}`;
        this.solicitudForm.get('folioProyecto').setValue(label, { emitEvent: false });
    }

    private _setupProveedorFilter(): void {
        const control = this.solicitudForm.get('proveedorSugerido');
        this.filteredProveedores$ = control.valueChanges.pipe(
            startWith(''),
            debounceTime(400),
            distinctUntilChanged(),
            switchMap(value => {
                // Solo buscar si el control ha sido editado manualmente y tiene al menos 2 caracteres
                if (control.dirty && typeof value === 'string' && value.trim().length >= 2) {
                    return this._solicitudCompraService.buscarProveedores(value.trim());
                }
                return of([] as ProveedorDto[]);
            }),
            shareReplay(1)
        );
    }

    onProveedorSelected(event: any): void {
        const proveedor = event.option.value as ProveedorDto;
        
        this.solicitudForm.patchValue({
            proveedorSugerido: proveedor.nombre,
            rfc: proveedor.rfc,
            banco: proveedor.banco || '',
            cuenta: proveedor.cuenta || '',
            clabe: proveedor.clabe || '',
            datosBancariosProveedor: proveedor.cuenta_Bancaria || ''
        }, { emitEvent: false });
    }

    private _setupBancoFilter(): void {
        this.filteredBancos$ = this.solicitudForm.get('banco').valueChanges.pipe(
            startWith(''),
            map(value => this._filterBancos(value || ''))
        );
    }

    private _filterBancos(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.bancosMexico.filter(banco => banco.toLowerCase().includes(filterValue));
    }

    /**
     * Formatea la CLABE en tiempo real con guiones (XXX-XXX-XXXXXXXXXXX-X)
     * @param event Evento de input
     */
    formatCLABE(event: any): void {
        const input = event.target;
        const formatted = this._getFormattedValueCLABE(input.value);
        
        input.value = formatted;
        this.solicitudForm.get('clabe').setValue(formatted, { emitEvent: false });
    }

    private _getFormattedValueCLABE(value: string): string {
        if (!value) return '';
        let cleanValue = value.replace(/\D/g, ''); // Solo números
        
        // Limitar a los 18 dígitos de la CLABE estándar de México
        if (cleanValue.length > 18) {
            cleanValue = cleanValue.substring(0, 18);
        }

        let formatted = '';
        if (cleanValue.length > 0) {
            // Primeros 3 (Banco)
            formatted += cleanValue.substring(0, 3);
            if (cleanValue.length > 3) {
                // Siguientes 3 (Plaza)
                formatted += '-' + cleanValue.substring(3, 6);
                if (cleanValue.length > 6) {
                    // Siguientes 11 (Cuenta - No. de cuenta)
                    formatted += '-' + cleanValue.substring(6, 17);
                    if (cleanValue.length > 17) {
                        // Último 1 (Dígito control)
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
                const monto = parseFloat(curr.monto) || 0; // Monto is the unit price
                const subtotalLinea = Number((cantidad * monto).toFixed(4));
                const ivaLinea = Number((subtotalLinea * 0.16).toFixed(4));
                
                subtotal += subtotalLinea;
                totalPiezas += cantidad;

                // Update row's IVA display if it changed (silent to avoid infinite loop)
                const currentIva = Number(curr.iva || 0).toFixed(2);
                const calcIva = ivaLinea.toFixed(2);
                if (currentIva !== calcIva) {
                    this.detalles.at(i).patchValue({ iva: ivaLinea }, { emitEvent: false });
                }
            });

            // Redondear para el cálculo del IVA
            subtotal = Number(subtotal.toFixed(2));
            const iva = Number((subtotal * 0.16).toFixed(2));
            const total = Number((subtotal + iva).toFixed(2));

            // Actualizar controles de cabecera
            this.solicitudForm.patchValue({
                subtotal: subtotal,
                iva: iva,
                monto: total,
                totalPiezas: totalPiezas
            }, { emitEvent: false });
        });
    }

    private _setupProductSearch(index: number): void {
        const control = this.detalles.at(index).get('materialServicio');
        this.filteredProducts$[index] = control.valueChanges.pipe(
            debounceTime(500),
            // We keep switchMap but handle errors to prevent the stream from completing
            switchMap(value => {
                // Only search if it's a string and has at least 2 chars
                if (typeof value === 'string' && value.trim().length >= 2) {
                    // Logic to map sucursal to almacen for CONTPAQi
                    const sucursal = this.solicitudForm.get('sucursal').value || '';
                    
                    // Normalize to remove accents (e.g., QUERÉTARO -> QUERETARO)
                    let almacen = sucursal.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

                    if (sucursal.toLowerCase().includes('hidalgo')) {
                        almacen = 'SANTA JULIA';
                    }

                    return this._solicitudCompraService.consultarExistenciaContpaqi(value.trim(), almacen)
                        .pipe(
                            catchError(() => of([] as ProductoBuscadorDto[]))
                        );
                }
                return of([] as ProductoBuscadorDto[]);
            }),
            // Use shareReplay to avoid multiple subscriptions breaking the UI logic
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

        // Populate fields from selected product
        detailGroup.patchValue({
            materialServicio: product.nombreProducto, // We patch it back as string for manual edit later
            descripcionEspecificacion: `${product.codigoProducto} - ${product.nombreProducto}`,
            unidad: product.unidadMedida
        }, { emitEvent: false });

        // Force the input to show the name string instead of the object
        // by resetting the control value to the name string
        setTimeout(() => {
            detailGroup.get('materialServicio').setValue(product.nombreProducto, { emitEvent: false });
            
            // Auto-focus the quantity field
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

        // Split by lines (Excel uses \r\n or \n)
        const lines = pastedText.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length <= 1) return; // Regular single value paste

        // Prevent default paste of the whole block into a single cell
        event.preventDefault();

        lines.forEach((line, i) => {
            const currentIndex = index + i;
            
            // If the row doesn't exist, create it
            if (currentIndex >= this.detalles.length) {
                this.addDetalle();
            }

            // Patch the value for the specific field
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
            
            // Formatear CLABE con guiones para la vista
            if (solicitud.clabe) {
                const formatted = this._getFormattedValueCLABE(solicitud.clabe);
                this.solicitudForm.get('clabe').setValue(formatted, { emitEvent: false });
            }
            // Clear details array and search observables
            while (this.detalles.length) {
                this.detalles.removeAt(0);
            }
            this.filteredProducts$ = [];
            solicitud.detalles.forEach(d => {
                // Si hay monto pero no cantidad, asumimos 1 unidad para no perder el valor en la automatización
                const cantidad = d.cantidad || 0;
                const monto = d.monto || 0;
                let precioUnitario = 0;

                if (cantidad > 0) {
                    precioUnitario = monto / cantidad;
                } else if (monto > 0) {
                    // Item legacy o servicio sin cantidad explícita
                    precioUnitario = monto;
                }

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

            // Setup search for loaded details
            this.detalles.controls.forEach((_, i) => this._setupProductSearch(i));

            this.loadArchivos(id);
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
            // Reset input to allow selecting the same file again if removed
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
            
            // Map technical names to friendly names
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
                if (name !== 'detalles' && controls[name].invalid) {
                    invalidFields.push(fieldNames[name] || name);
                }
            }

            // Check details
            if (this.detalles.length === 0) {
                 invalidFields.push('Debe agregar al menos una partida en detalle');
            } else {
                this.detalles.controls.forEach((group: FormGroup, i) => {
                    if (group.invalid) {
                        invalidFields.push(`Error en partida #${i+1}`);
                    }
                });
            }

            const message = `Faltan campos por completar:\n- ${invalidFields.join('\n- ')}`;
            this._chatNotificationService.showWarning('Atención', message);
            
            // Focus first error
            const firstInvalidControl = document.querySelector('.mat-form-field-invalid');
            if (firstInvalidControl) {
                firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            return;
        }

        const data = { ...this.solicitudForm.value };
        
        // Quitar guiones de la CLABE antes de enviar a la API
        if (data.clabe) {
            data.clabe = data.clabe.replace(/\D/g, '');
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
}
