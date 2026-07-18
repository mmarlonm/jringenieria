import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { EngineeringService, Solicitante, SeguimientoProyecto } from '../../engineering.service';
import { SolicitanteDialogComponent } from '../../solicitantes/solicitante-dialog/solicitante-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-seguimiento-dialog',
    templateUrl: './seguimiento-dialog.component.html',
    styleUrls: ['./seguimiento-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule
    ]
})
export class SeguimientoDialogComponent implements OnInit {
    form: FormGroup;
    isEdit: boolean = false;
    solicitantes: Solicitante[] = [];

    // Listas de Estatus para el Formulario
    levantamientoOptions = [
        { id: 1, label: 'Pendiente' },
        { id: 2, label: 'En Proceso' },
        { id: 3, label: 'Concluida' },
        { id: 4, label: 'Detenida' }
    ];

    cotizacionOptions = [
        { id: 1, label: 'Pendiente' },
        { id: 2, label: 'En Proceso' },
        { id: 3, label: 'Concluida' },
        { id: 4, label: 'Detenida' }
    ];

    aprobacionOptions = [
        { id: 1, label: 'En Espera' },
        { id: 2, label: 'Aprobado' },
        { id: 3, label: 'Rechazado' }
    ];

    tiposProyecto = ['CONSTRUCCION', 'MANTENIMIENTO', 'INSTALACION', 'PROYECTO ESPECIAL', 'OTRO'];

    isReadOnly: boolean = false;

    constructor(
        private _fb: FormBuilder,
        private _dialog: MatDialog,
        private _engineeringService: EngineeringService,
        private _dialogRef: MatDialogRef<SeguimientoDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { seguimiento?: SeguimientoProyecto }
    ) { }

    agregarSolicitante(): void {
        if (this.isReadOnly) return;
        const dialogRef = this._dialog.open(SolicitanteDialogComponent, {
            width: '100%',
            maxWidth: '500px',
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe((newSolicitante) => {
            if (newSolicitante) {
                this._engineeringService.saveSolicitante(newSolicitante).subscribe({
                    next: (res) => {
                        this._engineeringService.getSolicitantes().subscribe((solicitantes) => {
                            this.solicitantes = solicitantes;
                            if (res && res.idSolicitante) {
                                this.form.get('idSolicitante').setValue(res.idSolicitante);
                            }
                        });

                        Swal.fire({
                            title: '¡Creado!',
                            text: 'El solicitante fue creado y seleccionado',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo crear el solicitante', 'error');
                    }
                });
            }
        });
    }

    ngOnInit(): void {
        this.isEdit = !!this.data?.seguimiento;
        const isApproved = this.data?.seguimiento?.estatusAprobacion === 2;

        // Cargar solicitantes activos
        this._engineeringService.getSolicitantes().subscribe((solicitantes) => {
            this.solicitantes = solicitantes;

            // Si el solicitante actual está inactivo o no está en la lista (por si acaso), lo agregamos para visualización
            if (this.isEdit && this.data.seguimiento) {
                const currentId = this.data.seguimiento.idSolicitante;
                if (!this.solicitantes.some(s => s.idSolicitante === currentId)) {
                    this.solicitantes.push({
                        idSolicitante: currentId,
                        nombreCompleto: this.data.seguimiento.nombreCompleto || 'Desconocido',
                        empresa: this.data.seguimiento.empresa || 'Desconocido',
                        activo: true
                    });
                }
            }
        });

        this.form = this._fb.group({
            idSeguimiento: [this.data?.seguimiento?.idSeguimiento || 0],
            idSolicitante: [this.data?.seguimiento?.idSolicitante || '', Validators.required],
            actividad: [this.data?.seguimiento?.actividad || '', [Validators.required, Validators.maxLength(500)]],
            tipo: [this.data?.seguimiento?.tipo || ''],
            estatusLevantamiento: [this.data?.seguimiento?.estatusLevantamiento || 1, Validators.required],
            estatusCotizacion: [this.data?.seguimiento?.estatusCotizacion || 1, Validators.required],
            estatusAprobacion: [{ value: this.data?.seguimiento?.estatusAprobacion || 1, disabled: isApproved }, Validators.required],
            montoTotalEstimado: [this.formatMonto(this.data?.seguimiento?.montoTotalEstimado) || ''],
            quienRealizoLevantamiento: [this.data?.seguimiento?.quienRealizoLevantamiento || '', Validators.maxLength(500)],
            quienCotizo: [this.data?.seguimiento?.quienCotizo || '', Validators.maxLength(255)]
        });
    }

    formatMonto(value: any): string {
        if (value === null || value === undefined || value === '') return '';
        const clean = value.toString().replace(/[^0-9.]/g, '');
        const number = parseFloat(clean);
        return isNaN(number) ? '' : number.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    parseMonto(value: string): number | null {
        if (!value) return null;
        const clean = value.toString().replace(/[^0-9.]/g, '');
        const number = parseFloat(clean);
        return isNaN(number) ? null : number;
    }

    onMontoBlur(): void {
        const val = this.form.get('montoTotalEstimado').value;
        this.form.get('montoTotalEstimado').setValue(this.formatMonto(val), { emitEvent: false });
    }

    onSave(): void {
        if (this.form.invalid) {
            return;
        }

        // Obtener el ID de usuario registrado desde localStorage
        const userObjStr = localStorage.getItem('userInformation');
        let idUsuario = 1; // fallback admin ID
        if (userObjStr) {
            try {
                const userObj = JSON.parse(userObjStr);
                idUsuario = userObj?.usuario?.usuarioId || userObj?.usuario?.id || 1;
            } catch (e) {
                console.error(e);
            }
        }

        const val = this.form.getRawValue();
        const payload = {
            ...val,
            montoTotalEstimado: this.parseMonto(val.montoTotalEstimado),
            idUsuarioRegistro: idUsuario
        };

        this._dialogRef.close(payload);
    }

    onCancel(): void {
        this._dialogRef.close();
    }
}
