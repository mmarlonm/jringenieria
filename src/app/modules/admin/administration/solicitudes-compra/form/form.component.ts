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
import { SolicitudCompraCreateDto, ProductoBuscadorDto } from '../models/solicitud-compra.types';
import { debounceTime, distinctUntilChanged, filter, map, Observable, of, startWith, switchMap } from 'rxjs';
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
    selectedFile: File | null = null;
    archivos: any[] = [];
    filteredProducts$: Observable<ProductoBuscadorDto[]>[] = [];

    // Select options
    prioridades = ['Urgente', 'Alta', 'Normal'];
    tiposCompra = ['Material para proyecto', 'Inventario almacén', 'Herramienta', 'Consumible', 'Servicio'];
    centrosCosto = ['Proyecto específico', 'Operación sucursal', 'Administración'];
    areas = ['Proyectos', 'Almacén', 'Ventas', 'Administración', 'Marketing', 'RH'];
    formasPago = ['Debito', 'Credito'];
    razonesSociales = ['Jesus Ricardo Mendez', 'JR Ingenieria Electrica'];
    sucursales: any[] = [];

    constructor(
        private _formBuilder: FormBuilder,
        private _solicitudCompraService: SolicitudCompraService,
        private _projectService: ProjectService,
        private _chatNotificationService: ChatNotificationService,
        private _route: ActivatedRoute,
        private _router: Router
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.loadBranches();

        this._route.params.subscribe(params => {
            if (params['id']) {
                this.isEdit = true;
                this.solicitudId = +params['id'];
                this.loadSolicitud(this.solicitudId);
            }
        });
    }

    initForm(): void {
        this.solicitudForm = this._formBuilder.group({
            idSolicitud: [0],
            sucursal: ['', Validators.required],
            areaSolicitante: ['', Validators.required],
            idPersonaSolicitante: [1], // Mocked for now
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
            formaPago: [''],
            razonSocial: ['', Validators.required],
            detalles: this._formBuilder.array([])
        });
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
            observaciones: ['']
        });

        const index = this.detalles.length;
        this.detalles.push(detalleForm);
        this._setupProductSearch(index);
    }

    private _setupProductSearch(index: number): void {
        const control = this.detalles.at(index).get('materialServicio');
        this.filteredProducts$[index] = control.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(value => {
                // Only search if it's a string and has at least 2 chars
                if (typeof value === 'string' && value.length >= 2) {
                    return this._solicitudCompraService.buscarProductos(value);
                }
                return of([]);
            })
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
        });
    }

    removeDetalle(index: number): void {
        this.detalles.removeAt(index);
    }

    loadSolicitud(id: number): void {
        this._solicitudCompraService.getPorId(id).subscribe(solicitud => {
            this.solicitudForm.patchValue(solicitud);
            // Clear details array and reload
            while (this.detalles.length) {
                this.detalles.removeAt(0);
            }
            solicitud.detalles.forEach(d => {
                const detalleForm = this._formBuilder.group({
                    idDetalle: [d.idDetalle],
                    partida: [d.partida],
                    materialServicio: [d.materialServicio],
                    descripcionEspecificacion: [d.descripcionEspecificacion],
                    cantidad: [d.cantidad],
                    unidad: [d.unidad],
                    observaciones: [d.observaciones]
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
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
        }
    }

    save(): void {
        if (this.solicitudForm.invalid) {
            this._chatNotificationService.showWarning('Atención', 'Por favor complete todos los campos requeridos');
            return;
        }

        const data = this.solicitudForm.value;
        if (this.isEdit) {
            this._solicitudCompraService.actualizar(data).subscribe(() => {
                if (this.selectedFile) {
                    this._solicitudCompraService.subirArchivo(this.solicitudId, this.selectedFile).subscribe(() => {
                        this._chatNotificationService.showSuccess('Éxito', 'Solicitud actualizada correctamente con nuevo archivo');
                        this._router.navigate(['../../'], { relativeTo: this._route });
                    });
                } else {
                    this._chatNotificationService.showSuccess('Éxito', 'Solicitud actualizada correctamente');
                    this._router.navigate(['../../'], { relativeTo: this._route });
                }
            });
        } else {
            this._solicitudCompraService.crear(data).subscribe((response) => {
                const newId = response.idSolicitud || response.id;
                
                if (this.selectedFile && newId) {
                    this._solicitudCompraService.subirArchivo(newId, this.selectedFile).subscribe(() => {
                        this._chatNotificationService.showSuccess('Éxito', 'Solicitud y archivo guardados correctamente');
                        this._router.navigate(['../'], { relativeTo: this._route });
                    });
                } else {
                    this._chatNotificationService.showSuccess('Éxito', 'Solicitud de compra guardada correctamente');
                    this._router.navigate(['../'], { relativeTo: this._route });
                }
            });
        }
    }

    cancelar(): void {
        const path = this.isEdit ? '../../' : '../';
        this._router.navigate([path], { relativeTo: this._route });
    }
}
