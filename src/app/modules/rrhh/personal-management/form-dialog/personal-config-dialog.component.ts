import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

// 🔹 Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';

import { PersonalManagementService } from '../personal-management.service';

@Component({
    selector: 'app-personal-config-dialog',
    standalone: true,
    templateUrl: './personal-config-dialog.component.html',
    styleUrl: './personal-config-dialog.component.scss',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatButtonModule,
        MatTabsModule,
        MatDividerModule
    ]
})
export class PersonalConfigDialogComponent implements OnInit {
    private _fb = inject(FormBuilder);

    form: FormGroup;
    departments: any[] = [];
    daysOfWeek = [
        { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
        { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 7, name: 'Domingo' }
    ];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _personalService: PersonalManagementService,
        private _dialogRef: MatDialogRef<PersonalConfigDialogComponent>
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        // 1. Cargar catálogos
        this._personalService.getDepartamentos().subscribe({
            next: (deps) => this.departments = deps,
            error: (err) => console.error('Error al cargar departamentos', err)
        });

        // 2. Cargar toda la info del usuario
        this.loadExistingData();
    }

    private initForm(): void {
        this.form = this._fb.group({
            usuarioId: [this.data.usuarioId],
            puesto: ['', Validators.required],
            departamentoId: [null, Validators.required],
            fechaIngreso: [null, Validators.required],
            sueldoBase: [0, [Validators.required, Validators.min(0)]],
            sexo: [1],
            fechaNacimiento: [null],
            direccion: [''],
            horarios: this._fb.array([])
        });
    }

    /**
     * Nombre: loadExistingData
     * Descripción: Consume el endpoint personal-info para llenar TODO el formulario
     */
    private loadExistingData(): void {
        this._personalService.getPersonalInfo(this.data.usuarioId).subscribe({
            next: (res) => {
                console.log('res', res);
                if (res) {
                    // Parcheamos los valores simples (puesto, departamento, sueldo, etc.)
                    this.form.patchValue({
                        puesto: res.puesto,
                        departamentoId: res.departamentoId,
                        fechaIngreso: res.fechaIngreso,
                        sueldoBase: res.sueldoBase,
                        sexo: res.sexo,
                        fechaNacimiento: res.fechaNacimiento,
                        direccion: res.direccion
                    });

                    // Limpiamos y llenamos el array de horarios
                    this.horarios.clear();
                    if (res.horarios && res.horarios.length > 0) {
                        res.horarios.forEach(h => this.addHorario(h));
                    }
                }
            },
            error: (err) => console.error('Error al recuperar expediente', err)
        });
    }

    get horarios(): FormArray {
        return this.form.get('horarios') as FormArray;
    }

    addHorario(data?: any): void {
        const horarioGroup = this._fb.group({
            diaSemana: [data?.diaSemana || 1, Validators.required],
            horaEntrada: [data?.horaEntrada || '08:00:00', Validators.required],
            horaSalida: [data?.horaSalida || '18:00:00', Validators.required]
        });
        this.horarios.push(horarioGroup);
    }

    removeHorario(index: number): void {
        this.horarios.removeAt(index);
    }

    close(): void {
        this._dialogRef.close();
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        // Retornamos el valor limpio al dashboard para el updateInfo
        this._dialogRef.close(this.form.value);
    }

    /**
     * Nombre: addStandardWorkWeek
     * Descripción: Carga automáticamente la jornada de Lunes a Sábado con horarios predefinidos.
     */
    addStandardWorkWeek(): void {
        // 1. Limpiamos horarios actuales para evitar duplicados
        this.horarios.clear();

        // 2. Definimos la jornada estándar
        const jornadaEstandar = [
            { dia: 1, entrada: '08:00', salida: '18:00' }, // Lun
            { dia: 2, entrada: '08:00', salida: '18:00' }, // Mar
            { dia: 3, entrada: '08:00', salida: '18:00' }, // Mie
            { dia: 4, entrada: '08:00', salida: '18:00' }, // Jue
            { dia: 5, entrada: '08:00', salida: '18:00' }, // Vie
            { dia: 6, entrada: '08:00', salida: '14:00' }, // Sab
        ];

        // 3. Insertamos en el FormArray
        jornadaEstandar.forEach(config => {
            this.horarios.push(this._fb.group({
                diaSemana: [config.dia, Validators.required],
                horaEntrada: [config.entrada, Validators.required],
                horaSalida: [config.salida, Validators.required]
            }));
        });
    }
}