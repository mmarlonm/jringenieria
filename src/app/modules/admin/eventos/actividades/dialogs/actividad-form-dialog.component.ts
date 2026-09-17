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
import { MatCheckboxModule } from '@angular/material/checkbox';
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
        MatCheckboxModule,
        TimePickerComponent
    ]
})
export class ActividadFormDialogComponent implements OnInit {
    form: FormGroup;
    isEdit: boolean = false;
    isSaving: boolean = false;
    eventosList: any[] = [];
    personalList: PersonalStaff[] = [];
    actividadesPadreList: any[] = [];
    isAsignacionLibre: boolean = false;

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
        const act = this.data?.actividad;

        this.isAsignacionLibre = !!act?.nombreAsignadoLibre || (!act?.personalStaffId && act?.personalStaffNombre !== 'General / Sin Asignar' && !!act?.personalStaffNombre);

        this._eventosService.ediciones$.subscribe(list => {
            this.eventosList = list || [];
        });

        this._personalStaffService.getAll().subscribe(list => {
            this.personalList = list || [];
        });

        const selectedEvId = act?.eventoId || this.data?.selectedEventoId || 0;
        this.loadActividadesPadre(selectedEvId);

        let initDate = new Date();
        let initTime = '09:00';
        let endDate = new Date();
        let endTime = '18:00';

        if (act) {
            const start = new Date(act.fechaInicio);
            const end = new Date(act.fechaFin);
            if (!isNaN(start.getTime())) {
                initDate = start;
                initTime = this.formatTimeOnly(start);
            }
            if (!isNaN(end.getTime())) {
                endDate = end;
                endTime = this.formatTimeOnly(end);
            }
        }

        this.form = this._fb.group({
            id: [act?.id || 0],
            eventoId: [selectedEvId, [Validators.required]],
            personalStaffId: [act?.personalStaffId || 0],
            nombreAsignadoLibre: [act?.nombreAsignadoLibre || (this.isAsignacionLibre ? act?.personalStaffNombre : '') || ''],
            actividadPadreId: [act?.actividadPadreId || this.data?.actividadPadreId || null],
            tipoActividad: [act?.tipoActividad || 'General', [Validators.required]],
            titulo: [act?.titulo || '', [Validators.required, Validators.maxLength(150)]],
            descripcion: [act?.descripcion || '', [Validators.maxLength(500)]],
            fechaInicioDate: [initDate, [Validators.required]],
            fechaInicioTime: [initTime, [Validators.required]],
            fechaFinDate: [endDate, [Validators.required]],
            fechaFinTime: [endTime, [Validators.required]]
        });

        this.form.get('eventoId').valueChanges.subscribe(evId => {
            if (evId) {
                this.loadActividadesPadre(evId);
            }
        });
    }

    loadActividadesPadre(eventoId: number): void {
        if (!eventoId) return;
        this._actividadesService.getAll(eventoId).subscribe({
            next: (list) => {
                const currentId = this.data?.actividad?.id || 0;
                this.actividadesPadreList = (list || []).filter(a => a.id !== currentId && !a.actividadPadreId);
            }
        });
    }

    toggleAsignacionLibre(checked: boolean): void {
        this.isAsignacionLibre = checked;
        if (checked) {
            this.form.patchValue({ personalStaffId: 0 });
        } else {
            this.form.patchValue({ nombreAsignadoLibre: '' });
        }
    }

    formatTimeOnly(d: Date): string {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    combineDateAndTime(dateObj: any, timeStr: string): string {
        if (!dateObj || !timeStr) return '';
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
        const staffId = Number(formVal.personalStaffId);

        const payload = {
            id: formVal.id,
            eventoId: Number(formVal.eventoId),
            personalStaffId: this.isAsignacionLibre ? null : (staffId > 0 ? staffId : null),
            nombreAsignadoLibre: this.isAsignacionLibre ? (formVal.nombreAsignadoLibre || '').trim() : (staffId > 0 ? null : (formVal.nombreAsignadoLibre || '').trim()),
            actividadPadreId: formVal.actividadPadreId ? Number(formVal.actividadPadreId) : null,
            tipoActividad: formVal.tipoActividad || 'General',
            titulo: formVal.titulo.trim(),
            descripcion: (formVal.descripcion || '').trim(),
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
