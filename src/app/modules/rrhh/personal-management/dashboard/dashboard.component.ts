import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';

// 🔹 Highcharts y Material
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

import { PersonalManagementService } from '../personal-management.service';
import { PersonalConfigDialogComponent } from '../form-dialog/personal-config-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ChangeDetectorRef } from '@angular/core';
@Component({
    selector: 'app-personal-management-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule, MatIconModule,
        HighchartsChartModule, MatFormFieldModule, MatSelectModule,
        MatInputModule, MatDatepickerModule, MatNativeDateModule,
        MatButtonModule, MatDividerModule
    ]
})
export class PersonalManagementDashboardComponent implements OnInit {
    private _fb = inject(FormBuilder);
    private _changeDetectorRef = inject(ChangeDetectorRef);

    users: any[] = [];
    selectedUser: any = null;
    hrForm: FormGroup;

    departments: any[] = [];

    daysOfWeek = [
        { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
        { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 7, name: 'Domingo' }
    ];

    constructor(
        private personalManagementService: PersonalManagementService,
        private _matDialog: MatDialog
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.personalManagementService.getUsers().subscribe((users) => {
            this.users = users;
            console.log(this.users);
            this._changeDetectorRef.markForCheck();
        });
    }

    private initForm(): void {
        this.hrForm = this._fb.group({
            usuarioId: [null, Validators.required],
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

    get horarios(): FormArray {
        return this.hrForm.get('horarios') as FormArray;
    }

    selectUser(user: any): void {
        this.selectedUser = user;
        this.hrForm.patchValue({ usuarioId: user.usuarioId });
        // Aquí podrías llamar a un servicio para traer la info de RRHH si ya existe
    }

    addSchedule(): void {
        const scheduleForm = this._fb.group({
            diaSemana: [1, Validators.required],
            horaEntrada: ['08:00:00', Validators.required],
            horaSalida: ['18:00:00', Validators.required]
        });
        this.horarios.push(scheduleForm);
    }

    removeSchedule(index: number): void {
        this.horarios.removeAt(index);
    }

    saveInfo(): void {
        if (this.hrForm.invalid) return;

        this.personalManagementService.upsertInfo(this.hrForm.value).subscribe({
            next: () => {
                // Notificación de éxito estilo Fuse
                console.log('Guardado correctamente');
            }
        });
    }

    openConfigModal(user: any): void {
        const dialogRef = this._matDialog.open(PersonalConfigDialogComponent, {
            width: '800px',
            data: user,
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.personalManagementService.upsertInfo(result).subscribe(() => {
                    // Mostrar alerta de éxito estilo Fuse
                });
            }
        });
    }
}