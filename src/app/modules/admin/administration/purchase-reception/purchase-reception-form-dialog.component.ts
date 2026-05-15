import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { Subject, takeUntil, debounceTime, switchMap, of, catchError, forkJoin } from 'rxjs';

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

    ngOnInit(): void {
        this.initForm();
        this.loadUsers();
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
            estatus: [0, Validators.required],
            folioInternoFactura: ['']
        });
    }

    onSearchOC(event: any): void {
        const folio = event.target.value;
        if (!folio) return;

        this.isLoading = true;
        this._receptionService.getDetalleConsolidado(folio).subscribe({
            next: (res) => {
                this.ocData = res;
                if (res) {
                    this.receptionForm.patchValue({
                        idSolicitud: res.idSolicitud || folio,
                        lugarEntrega: res.lugarEntrega || '',
                        folioInternoFactura: res.datosFiscales?.folioInternoFactura || ''
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
            estatus: this.receptionForm.value.estatus,
            folioInternoFactura: this.receptionForm.value.folioInternoFactura
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
