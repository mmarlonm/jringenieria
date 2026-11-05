import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { CalendarioGoogle, CalendarioService, EventoNuevo } from '../calendario.service';

export interface NuevoEventoDialogData {
    calendarios: CalendarioGoogle[];
    calendarioPorDefectoId: string;
    fechaInicio?: Date;
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function formatDateOnly(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateTimeLocal(d: Date): string {
    return `${formatDateOnly(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

@Component({
    selector: 'app-nuevo-evento-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatIconModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './nuevo-evento-dialog.component.html',
})
export class NuevoEventoDialogComponent implements OnInit {
    form: FormGroup;
    calendariosEscribibles: CalendarioGoogle[] = [];
    guardando = false;
    error = '';

    constructor(
        private _fb: FormBuilder,
        private _calendarioService: CalendarioService,
        private _dialogRef: MatDialogRef<NuevoEventoDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: NuevoEventoDialogData,
        private _cdr: ChangeDetectorRef
    ) {
        this.calendariosEscribibles = (data.calendarios || []).filter(
            c => c.rol === 'owner' || c.rol === 'writer'
        );

        const fechaIni = data.fechaInicio ? new Date(data.fechaInicio) : new Date();
        if (!data.fechaInicio) {
            fechaIni.setHours(9, 0, 0, 0);
        }
        const fechaFin = new Date(fechaIni.getTime() + 60 * 60 * 1000);

        const idSeleccionado = this.calendariosEscribibles.some(c => c.id === data.calendarioPorDefectoId)
            ? data.calendarioPorDefectoId
            : (this.calendariosEscribibles[0]?.id || '');

        this.form = this._fb.group({
            calendarioId: [idSeleccionado, Validators.required],
            titulo: ['', [Validators.required, Validators.maxLength(200)]],
            todoElDia: [false],
            inicio: [formatDateTimeLocal(fechaIni), Validators.required],
            fin: [formatDateTimeLocal(fechaFin), Validators.required],
            ubicacion: [''],
            descripcion: [''],
        });
    }

    ngOnInit(): void {
        this.form.valueChanges.subscribe(() => {
            this._cdr.markForCheck();
        });
    }

    get finInvalido(): boolean {
        const inicio = this.form.get('inicio')?.value;
        const fin = this.form.get('fin')?.value;
        const todoElDia = this.form.get('todoElDia')?.value;
        if (!inicio || !fin) return false;

        if (todoElDia) {
            return fin < inicio;
        }
        return new Date(fin).getTime() <= new Date(inicio).getTime();
    }

    alCambiarTodoElDia(checked: boolean): void {
        const inicioVal = this.form.get('inicio')?.value;
        const finVal = this.form.get('fin')?.value;

        if (checked) {
            const dInicio = inicioVal ? new Date(inicioVal) : new Date();
            const dFin = finVal ? new Date(finVal) : new Date();
            this.form.patchValue({
                inicio: formatDateOnly(dInicio),
                fin: formatDateOnly(dFin),
            });
        } else {
            const dInicio = inicioVal ? new Date(inicioVal + 'T09:00:00') : new Date();
            dInicio.setHours(9, 0, 0, 0);
            const dFin = new Date(dInicio.getTime() + 60 * 60 * 1000);
            this.form.patchValue({
                inicio: formatDateTimeLocal(dInicio),
                fin: formatDateTimeLocal(dFin),
            });
        }
    }

    cancelar(): void {
        this._dialogRef.close();
    }

    guardar(): void {
        if (this.form.invalid || this.finInvalido || this.guardando) {
            return;
        }

        this.guardando = true;
        this.error = '';

        const val = this.form.value;
        const todoElDia = !!val.todoElDia;

        let inicioStr = val.inicio;
        let finStr = val.fin;

        if (todoElDia) {
            inicioStr = `${val.inicio}T00:00:00`;
            finStr = `${val.fin}T00:00:00`;
        } else {
            if (inicioStr.length === 16) inicioStr += ':00';
            if (finStr.length === 16) finStr += ':00';
        }

        const nuevoEvento: EventoNuevo = {
            calendarioId: val.calendarioId,
            titulo: val.titulo.trim(),
            inicio: inicioStr,
            fin: finStr,
            todoElDia: todoElDia,
            ubicacion: val.ubicacion?.trim() || null,
            descripcion: val.descripcion?.trim() || null,
        };

        this._calendarioService.crearEvento(nuevoEvento).subscribe({
            next: (creado) => {
                this.guardando = false;
                this._dialogRef.close(creado);
            },
            error: (err: HttpErrorResponse) => {
                this.guardando = false;
                if (err.status === 403) {
                    this.error = err.error?.mensaje || 'No tienes permiso de escritura en ese calendario.';
                } else {
                    this.error = err.error?.mensaje || 'Ocurrió un error al crear el evento.';
                }
                this._cdr.markForCheck();
            },
        });
    }
}

