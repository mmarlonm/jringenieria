import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CapacitacionService } from '../capacitacion.service';
import { CapacitacionParticipante } from '../capacitacion.types';

@Component({
    selector: 'app-dialogo-participante',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatIconModule
    ],
    template: `
        <div class="flex flex-col max-w-lg w-full">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data.participante ? 'Editar Participante' : 'Agregar Participante al Curso' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-4">
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Nombre del Colaborador</mat-label>
                    <input matInput formControlName="colaboradorNombre" placeholder="Ej. Juan Pérez López" />
                    <mat-error *ngIf="form.get('colaboradorNombre')?.hasError('required')">El nombre es obligatorio</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Calificación (0 - 100)</mat-label>
                        <input matInput type="number" formControlName="calificacion" min="0" max="100" step="1" placeholder="Ej. 85" />
                        <mat-error *ngIf="form.get('calificacion')?.invalid">Entre 0 y 100</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Resultado de Aprobación</mat-label>
                        <mat-select formControlName="aprobado">
                            <mat-option [value]="null">Sin calificar / Pendiente</mat-option>
                            <mat-option [value]="true">Aprobado</mat-option>
                            <mat-option [value]="false">No Aprobado</mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>

                <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                    <mat-checkbox formControlName="asistio" color="primary">
                        Asistió a la capacitación
                    </mat-checkbox>
                    <mat-checkbox formControlName="constanciaEntregada" color="primary">
                        Constancia de participación entregada
                    </mat-checkbox>
                    <mat-checkbox formControlName="dc3Entregada" color="primary">
                        Formato DC-3 STPS entregado
                    </mat-checkbox>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Observaciones</mat-label>
                    <textarea matInput formControlName="observaciones" rows="3" placeholder="Notas sobre el desempeño, puntualidad, etc."></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">
                        Cancelar
                    </button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>{{ data.participante ? 'Guardar Cambios' : 'Agregar Participante' }}</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoParticipanteComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoParticipanteComponent>);
    private readonly _service = inject(CapacitacionService);

    form!: FormGroup;
    guardando = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { capacitacionId: number; participante?: CapacitacionParticipante }) {}

    ngOnInit(): void {
        const p = this.data.participante;
        this.form = this._fb.group({
            colaboradorNombre: [p?.colaboradorNombre || '', [Validators.required, Validators.maxLength(200)]],
            colaboradorId: [p?.colaboradorId ?? null],
            asistio: [p?.asistio ?? true],
            aprobado: [p?.aprobado ?? null],
            calificacion: [p?.calificacion ?? null, [Validators.min(0), Validators.max(100)]],
            constanciaEntregada: [p?.constanciaEntregada ?? false],
            dc3Entregada: [p?.dc3Entregada ?? false],
            observaciones: [p?.observaciones || '', [Validators.maxLength(1000)]]
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const val = this.form.value;

        const payload = {
            ...val,
            colaboradorNombre: val.colaboradorNombre.trim(),
            calificacion: val.calificacion !== null && val.calificacion !== '' ? Number(val.calificacion) : null,
            observaciones: val.observaciones ? val.observaciones.trim() : null
        };

        if (this.data.participante) {
            this._service.actualizarParticipante(this.data.participante.participanteId, payload).subscribe({
                next: (res) => {
                    this.guardando = false;
                    this._dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando = false;
                    alert(err?.error?.mensaje || 'Error al actualizar el participante');
                }
            });
        } else {
            this._service.agregarParticipante(this.data.capacitacionId, payload).subscribe({
                next: (res) => {
                    this.guardando = false;
                    this._dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando = false;
                    alert(err?.error?.mensaje || 'Error al agregar el participante');
                }
            });
        }
    }
}
