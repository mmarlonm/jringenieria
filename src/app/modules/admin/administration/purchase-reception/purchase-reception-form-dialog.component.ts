import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PurchaseReceptionService } from './purchase-reception.service';
import { UsersService } from '../../security/users/users.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { Subject, forkJoin } from 'rxjs';

@Component({
    selector: 'purchase-reception-form-dialog',
    templateUrl: './purchase-reception-form-dialog.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDatepickerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
        MatDividerModule,
        MatNativeDateModule,
        MatCardModule,
        MatOptionModule,
        MatAutocompleteModule
    ]
})
export class PurchaseReceptionFormDialogComponent implements OnInit {
    receptionForm: FormGroup;
    ocData: any = null;
    usuarios: any[] = [];
    selectedFiles: { file: File, type: string }[] = [];
    fileTypes = [
        { value: 'Facturas', label: 'Factura', color: 'text-emerald-500', icon: 'heroicons_outline:document-text' },
        { value: 'Evidencias', label: 'Evidencia', color: 'text-blue-500', icon: 'heroicons_outline:camera' },
        { value: 'Pagos', label: 'Pago/Anticipo', color: 'text-amber-500', icon: 'heroicons_outline:cash' }
    ];
    selectedType: string = 'Facturas';
    isLoading: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        public matDialogRef: MatDialogRef<PurchaseReceptionFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _formBuilder: FormBuilder,
        private _receptionService: PurchaseReceptionService,
        private _usersService: UsersService,
        private _notificationService: ChatNotificationService
    ) { }

    get facturas(): FormArray {
        return this.receptionForm.get('facturas') as FormArray;
    }

    ngOnInit(): void {
        this.initForm();
        this.loadUsers();

        const rec = this.data?.reception;
        if (rec) {
            const id = rec.idRecepcion || rec.id;
            this.isLoading = true;
            this._receptionService.getRecepcionPorId(id).subscribe({
                next: (res) => {
                    const actualRec = res.data || res;
                    if (actualRec) {
                        this.setFacturas(actualRec.facturas, actualRec.folioInternoFactura);
                    }
                    this.isLoading = false;
                },
                error: () => {
                    this.isLoading = false;
                }
            });
        }
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

    initForm(): void {
        const rec = this.data?.reception;
        const statusValue = rec?.estatus !== undefined ? rec.estatus : 0;
        this.receptionForm = this._formBuilder.group({
            idSolicitud: [rec?.idSolicitud || null, Validators.required],
            fechaRecepcion: [rec?.fechaRecepcion ? new Date(rec.fechaRecepcion) : new Date(), Validators.required],
            lugarEntrega: [rec?.lugarEntrega || '', Validators.required],
            quienRecibioId: [rec?.quienRecibioId || rec?.quienRecibio || null, Validators.required],
            dondeRecibio: [rec?.dondeRecibio || '', Validators.required],
            CondicionesComentarios: [rec?.condicionesComentarios || ''],
            estatus: [statusValue, Validators.required],
            facturas: this._formBuilder.array([]),
            puntajeCalidad: [rec?.puntajeCalidad !== undefined ? rec.puntajeCalidad : 100, Validators.required],
            puntajeEntrega: [rec?.puntajeEntrega !== undefined ? rec.puntajeEntrega : 100, Validators.required],
            puntajePrecio: [rec?.puntajePrecio !== undefined ? rec.puntajePrecio : 100, Validators.required],
            puntajeAtencion: [rec?.puntajeAtencion !== undefined ? rec.puntajeAtencion : 100, Validators.required],
            puntajeDocumentacion: [rec?.puntajeDocumentacion !== undefined ? rec.puntajeDocumentacion : 100, Validators.required],
            puntajeSeguridad: [rec?.puntajeSeguridad !== undefined ? rec.puntajeSeguridad : 100, Validators.required],
            puntajeGarantias: [rec?.puntajeGarantias !== undefined ? rec.puntajeGarantias : 100, Validators.required]
        });

        if (rec) {
            this.ocData = {
                idSolicitud: rec.idSolicitud,
                folioOC: rec.folioOC,
                sucursal: rec.sucursal,
                proyectoCliente: rec.proyectoCliente,
                datosFiscales: {
                    nombreProveedor: rec.proveedorSugerido || rec.nombreProveedor || rec.proveedor,
                    totalFactura: rec.monto,
                    moneda: rec.moneda || 'MXN',
                    folioInternoFactura: rec.folioInternoFactura
                }
            };
            this.setFacturas(rec.facturas, rec.folioInternoFactura);
        } else {
            this.addFactura();
        }
    }

    /** Crea una fila del FormArray de facturas */
    private buildFacturaRow(idFactura: number | null, folioFactura: string, monto: number | null): FormGroup {
        return this._formBuilder.group({
            idFactura: [idFactura],
            folioFactura: [folioFactura || '', Validators.required],
            monto: [monto]
        });
    }

    /**
     * Reemplaza el contenido del FormArray de facturas.
     * Compatible con recepciones antiguas que sólo tienen el texto plano en folioInternoFactura.
     */
    private setFacturas(facturasApi: any[] | undefined, folioInternoFacturaLegado: string | undefined): void {
        this.facturas.clear();

        if (facturasApi && facturasApi.length > 0) {
            facturasApi.forEach(f => {
                this.facturas.push(this.buildFacturaRow(f.idFactura ?? null, f.folioFactura, f.monto ?? null));
            });
            return;
        }

        // Fallback: registros previos a esta funcionalidad, guardados como texto "F-1, F-2"
        const folios = (folioInternoFacturaLegado || '')
            .split(',')
            .map(f => f.trim())
            .filter(f => !!f);

        if (folios.length > 0) {
            folios.forEach(folio => this.facturas.push(this.buildFacturaRow(null, folio, null)));
        } else {
            this.addFactura();
        }
    }

    addFactura(): void {
        this.facturas.push(this.buildFacturaRow(null, '', null));
    }

    removeFactura(index: number): void {
        this.facturas.removeAt(index);
        if (this.facturas.length === 0) this.addFactura();
    }

    onSearchOC(event: any): void {
        const folio = event.target.value;
        if (!folio) return;

        this.isLoading = true;
        this._receptionService.getDetalleConsolidado(folio).subscribe({
            next: (res) => {
                this.ocData = res;
                if (res) {
                    const nuevoFolio = res.datosFiscales?.folioInternoFactura;
                    if (nuevoFolio) {
                        const yaExiste = this.facturas.controls.some(
                            c => (c.get('folioFactura').value || '').trim() === nuevoFolio.trim()
                        );
                        const primeraVacia = this.facturas.controls.find(c => !c.get('folioFactura').value);
                        if (!yaExiste) {
                            if (primeraVacia) {
                                primeraVacia.patchValue({ folioFactura: nuevoFolio });
                            } else {
                                this.addFactura();
                                this.facturas.at(this.facturas.length - 1).patchValue({ folioFactura: nuevoFolio });
                            }
                        }
                    }

                    this.receptionForm.patchValue({
                        idSolicitud: res.idSolicitud || folio,
                        lugarEntrega: res.lugarEntrega || ''
                    });
                }
                this.isLoading = false;
            },
            error: () => {
                this.ocData = null;
                this.isLoading = false;
                this._notificationService.showError('Error', 'No se encontró información para el folio ingresado.');
            }
        });
    }

    onFileSelected(event: any): void {
        const files = event.target.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                this.selectedFiles.push({
                    file: files[i],
                    type: this.selectedType
                });
            }
        }
        // Reset input
        event.target.value = '';
    }

    removeFile(index: number): void {
        this.selectedFiles.splice(index, 1);
    }

    submit(): void {
        if (this.receptionForm.invalid) {
            this._notificationService.showWarning('Atención', 'Por favor complete todos los campos requeridos');
            return;
        }

        this.isLoading = true;

        const formValues = this.receptionForm.getRawValue();
        const facturasPayload = (formValues.facturas || []).filter((f: any) => !!f.folioFactura?.trim());

        // Ensure we send the data in the format the API expects
        const payload = {
            ...formValues,
            idRecepcion: this.data?.reception?.idRecepcion || this.data?.reception?.id || undefined,
            idSolicitud: this.ocData?.idSolicitud,
            folioOC: this.ocData?.folioOC,
            sucursal: this.ocData?.sucursal,
            proveedorSugerido: this.ocData?.datosFiscales?.nombreProveedor,
            proyectoCliente: this.ocData?.proyectoCliente,
            monto: this.ocData?.datosFiscales?.totalFactura,
            moneda: this.ocData?.datosFiscales?.moneda?.trim().includes('Peso') ? 'MXN' : (this.ocData?.datosFiscales?.moneda?.trim() || 'MXN'),
            estatus: formValues.estatus,
            facturas: facturasPayload
        };

        this._receptionService.registrarRecepcion(payload).subscribe({
            next: (res) => {
                const idRecepcion = res.idRecepcion || res.id;
                if (this.selectedFiles.length > 0) {
                    const uploads = this.selectedFiles.map(f =>
                        this._receptionService.subirArchivoRecepcion(idRecepcion, f.file, f.type)
                    );

                    forkJoin(uploads).subscribe({
                        next: () => this.handleSuccess(),
                        error: () => this.handleError('Error al subir algunos archivos')
                    });
                } else {
                    this.handleSuccess();
                }
            },
            error: () => this.handleError('Error al registrar la recepción')
        });
    }

    handleSuccess(): void {
        this.isLoading = false;
        this._notificationService.showSuccess('Éxito', 'Recepción registrada correctamente');
        this.matDialogRef.close(true);
    }

    handleError(msg: string): void {
        this.isLoading = false;
        this._notificationService.showError('Error', msg);
    }

    close(): void {
        this.matDialogRef.close();
    }
}
