import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ActividadesService } from '../actividades.service';
import { PersonalStaffService, PersonalStaff } from '../../personal-staff/personal-staff.service';
import { EventosService } from '../../eventos.service';
import { TimePickerComponent } from 'app/shared/time-picker/time-picker.component';

@Component({
    selector: 'app-actividad-form-dialog',
    templateUrl: './actividad-form-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        TimePickerComponent
    ]
})
export class ActividadFormDialogComponent implements OnInit {
    form: FormGroup;
    isEdit: boolean = false;
    isSaving: boolean = false;
    eventosList: any[] = [];
    personalList: PersonalStaff[] = [];

    constructor(
        private _fb: FormBuilder,
        private _dialogRef: MatDialogRef<ActividadFormDialogComponent>,
        private _actividadesService: ActividadesService,
        private _personalStaffService: PersonalStaffService,
        private _eventosService: EventosService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    ngOnInit(): void {
        this.isEdit = !!this.data?.actividad;

        this._eventosService.ediciones$.subscribe(list => {
            this.eventosList = list || [];
        });

        this._personalStaffService.getAll().subscribe(list => {
            this.personalList = list || [];
        });

        let initDate = new Date();
        let initTime = '09:00';
        let endDate = new Date();
        let endTime = '18:00';

        if (this.data?.actividad) {
            const start = new Date(this.data.actividad.fechaInicio);
            const end = new Date(this.data.actividad.fechaFin);
            initDate = start;
            initTime = this.formatTimeOnly(start);
            endDate = end;
            endTime = this.formatTimeOnly(end);
        }

        this.form = this._fb.group({
            id: [this.data?.actividad?.id || 0],
            personalStaffId: [this.data?.actividad?.personalStaffId || '', [Validators.required]],
            eventoId: [this.data?.actividad?.eventoId || this.data?.selectedEventoId || '', [Validators.required]],
            titulo: [this.data?.actividad?.titulo || '', [Validators.required, Validators.maxLength(150)]],
            descripcion: [this.data?.actividad?.descripcion || '', [Validators.maxLength(500)]],
            fechaInicioDate: [initDate, [Validators.required]],
            fechaInicioTime: [initTime, [Validators.required]],
            fechaFinDate: [endDate, [Validators.required]],
            fechaFinTime: [endTime, [Validators.required]]
        });
    }

    formatTimeOnly(d: Date): string {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    combineDateAndTime(dateObj: any, timeStr: string): string {
        if (!dateObj || !timeStr) return '';
        // MatDatepicker can return Date | string | moment – normalize to Date
        const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T${timeStr}:00`;
    }

    save(): void {
        if (this.form.invalid) return;

        this.isSaving = true;
        const formVal = this.form.value;
        const payload = {
            id: formVal.id,
            personalStaffId: formVal.personalStaffId,
            eventoId: formVal.eventoId,
            titulo: formVal.titulo,
            descripcion: formVal.descripcion,
            fechaInicio: this.combineDateAndTime(formVal.fechaInicioDate, formVal.fechaInicioTime),
            fechaFin: this.combineDateAndTime(formVal.fechaFinDate, formVal.fechaFinTime)
        };

        this._actividadesService.save(payload).subscribe({
            next: (res) => {
                this.isSaving = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.isSaving = false;
                console.error(err);
            }
        });
    }

    close(): void {
        this._dialogRef.close(null);
    }
}
