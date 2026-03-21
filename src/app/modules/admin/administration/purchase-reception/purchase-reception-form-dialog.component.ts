import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { PurchaseReceptionService } from './purchase-reception.service';
import { UsersService } from '../../security/users/users.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { FormControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, switchMap, of, catchError } from 'rxjs';

@Component({
    selector: 'purchase-reception-form-dialog',
    templateUrl: './purchase-reception-form-dialog.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
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
    invoiceSearchControl: FormControl = new FormControl('');
    ocData: any = null;
    usuarios: any[] = [];
    filteredFoliosFactura: any[] = [];
    evidenciaFile: File | null = null;
    comprobanteFile: File | null = null;
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

    ngOnInit(): void {
        this.initForm();
        this.loadUsers();
        this._setupInvoiceSearch();
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
        this.receptionForm = this._formBuilder.group({
            idSolicitud: [null, Validators.required],
            fechaRecepcion: [new Date(), Validators.required],
            lugarEntrega: ['', Validators.required],
            quienRecibioId: [null, Validators.required],
            dondeRecibio: ['', Validators.required],
            CondicionesComentarios: [''],
            estatus: [0, Validators.required]
        });
    }

    onSearchOC(event: any): void {
        const folio = event.target.value;
        if (!folio) return;

        this.isLoading = true;
        this._receptionService.getDetalleConsolidado(folio).subscribe({
            next: (res) => {
                this.ocData = res;
                if (res && res.idSolicitud) {
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
                this._notificationService.showError('Error', 'No se encontró información para el folio ingresado. Prueba buscar la factura manualmente.');
            }
        });
    }

    private _setupInvoiceSearch(): void {
        this.invoiceSearchControl.valueChanges.pipe(
            debounceTime(2000),
            switchMap(val => {
                if (typeof val !== 'string' || !val.trim()) return of([]);
                const query = val.trim();
                return this._receptionService.buscarFoliosContpaq(query).pipe(
                    catchError(() => of([]))
                );
            }),
            takeUntil(this._unsubscribeAll)
        ).subscribe(res => {
            this.filteredFoliosFactura = res;
        });
    }

    displayFolioFn(item: any): string {
        if (!item) return '';
        if (typeof item === 'string') return item;
        return item.folio || '';
    }

    onFolioContpaqSelected(event: MatAutocompleteSelectedEvent): void {
        const option = event.option.value;
        if (!option) return;

        this.isLoading = true;
        this._receptionService.getDetalleFolioContpaq(option.folio, option.rfc).subscribe({
            next: (detalle) => {
                if (!detalle) return;

                // Actualizar datos fiscales en ocData
                if (!this.ocData) {
                    this.ocData = { datosFiscales: {} };
                } else if (!this.ocData.datosFiscales) {
                    this.ocData.datosFiscales = {};
                }

                this.ocData.datosFiscales = {
                    ...this.ocData.datosFiscales,
                    totalFactura: detalle.total || 0,
                    folioInternoFactura: detalle.folio || '',
                    nombreProveedor: detalle.proveedor || '',
                    rfcProveedor: detalle.rfc || '',
                    folioFiscal_UUID: detalle.uuid || '',
                    moneda: (detalle.moneda === 'MXP' ? 'MXN' : detalle.moneda) || 'MXN'
                };

                this.isLoading = false;
                this._notificationService.showSuccess('Factura vinculada', `Datos de ${detalle.proveedor} cargados correctamente`);
            },
            error: () => {
                this.isLoading = false;
                this._notificationService.showError('Error', 'No se pudo obtener el detalle de la factura desde CONTPAQi');
            }
        });
    }

    onFileSelected(event: any, type: 'evidencia' | 'comprobante'): void {
        const file = event.target.files[0];
        if (file) {
            if (type === 'evidencia') this.evidenciaFile = file;
            else this.comprobanteFile = file;
        }
    }

    submit(): void {
        if (this.receptionForm.invalid) {
            this._notificationService.showWarning('Atención', 'Por favor complete todos los campos requeridos');
            return;
        }

        this.isLoading = true;

        // Ensure we send the data in the format the API expects
        const payload = {
            ...this.receptionForm.value,
            idSolicitud: this.ocData?.idSolicitud,
            folioOC: this.ocData?.folioOC,
            sucursal: this.ocData?.sucursal,
            proveedorSugerido: this.ocData?.datosFiscales?.nombreProveedor,
            proyectoCliente: this.ocData?.proyectoCliente,
            monto: this.ocData?.datosFiscales?.totalFactura,
            moneda: this.ocData?.datosFiscales?.moneda?.trim().includes('Peso') ? 'MXN' : (this.ocData?.datosFiscales?.moneda?.trim() || 'MXN'),
            estatus: this.receptionForm.value.estatus
        };

        this._receptionService.registrarRecepcion(payload).subscribe({
            next: (res) => {
                const idRecepcion = res.idRecepcion || res.id;
                if (this.evidenciaFile || this.comprobanteFile) {
                    this._receptionService.subirArchivos(idRecepcion, this.evidenciaFile, this.comprobanteFile).subscribe({
                        next: () => this.handleSuccess(),
                        error: () => this.handleError('Error al subir los archivos')
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
