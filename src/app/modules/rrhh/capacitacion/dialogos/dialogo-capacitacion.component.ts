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
import {
    CapacitacionDetalle,
    CapacitacionResumen,
    ORIGENES_CAPACITACION,
    TIPOS_CAPACITACION
} from '../capacitacion.types';

@Component({
    selector: 'app-dialogo-capacitacion',
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
        <div class="flex flex-col max-w-3xl w-full max-h-[90vh]">
            <!-- Header -->
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data?.capacitacion ? 'Editar Curso ' + data.capacitacion.folio : 'Registrar Nueva Capacitación' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <!-- Form -->
            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-4 overflow-y-auto px-1">
                <!-- Competencia & Área -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Competencia a Desarrollar</mat-label>
                        <input matInput formControlName="competencia" placeholder="Ej. Seguridad Eléctrica NOM-029" />
                        <mat-error *ngIf="form.get('competencia')?.hasError('required')">La competencia es obligatoria</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Área o Proceso</mat-label>
                        <input matInput formControlName="areaOProceso" placeholder="Ej. Operaciones / Mantenimiento" />
                        <mat-error *ngIf="form.get('areaOProceso')?.hasError('required')">El área es obligatoria</mat-error>
                    </mat-form-field>
                </div>

                <!-- Puesto Impactado & Proveedor -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Puesto Impactado</mat-label>
                        <input matInput formControlName="puestoImpactado" placeholder="Ej. Técnico Electricista" />
                        <mat-error *ngIf="form.get('puestoImpactado')?.hasError('required')">El puesto es obligatorio</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Instructor o Proveedor</mat-label>
                        <input matInput formControlName="proveedorOInstructor" placeholder="Ej. Instructor Certificado STPS" />
                        <mat-error *ngIf="form.get('proveedorOInstructor')?.hasError('required')">El instructor es obligatorio</mat-error>
                    </mat-form-field>
                </div>

                <!-- Tipo, Origen, Razón Social -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Tipo</mat-label>
                        <mat-select formControlName="tipo">
                            <mat-option *ngFor="let t of tipos" [value]="t">{{ t }}</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Origen</mat-label>
                        <mat-select formControlName="origen">
                            <mat-option *ngFor="let o of origenes" [value]="o">{{ o }}</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Razón Social</mat-label>
                        <input matInput formControlName="razonSocial" placeholder="JR Ingeniería S.A. de C.V." />
                        <mat-error *ngIf="form.get('razonSocial')?.hasError('required')">Requerido</mat-error>
                    </mat-form-field>
                </div>

                <!-- Fechas & Duración -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Fecha Programada</mat-label>
                        <input matInput type="date" formControlName="fechaProgramada" />
                        <mat-error *ngIf="form.get('fechaProgramada')?.hasError('required')">Requerido</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Fecha Término</mat-label>
                        <input matInput type="date" formControlName="fechaTermino" />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Duración (Horas)</mat-label>
                        <input matInput type="number" formControlName="duracionHoras" min="0.5" step="0.5" />
                        <mat-error *ngIf="form.get('duracionHoras')?.invalid">Mínimo 0.1 hrs</mat-error>
                    </mat-form-field>
                </div>

                <!-- Costos & Vigencia -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Costo Estimado ($)</mat-label>
                        <input matInput type="number" formControlName="costoEstimado" placeholder="0.00" />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Costo Real ($)</mat-label>
                        <input matInput type="number" formControlName="costoReal" placeholder="0.00" />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Vigencia (Meses)</mat-label>
                        <input matInput type="number" formControlName="vigenciaMeses" placeholder="Ej. 12 o 24" />
                        <mat-hint>Para cálculo de semáforo</mat-hint>
                    </mat-form-field>
                </div>

                <!-- DC-3 & DC-5 STPS -->
                <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                        <mat-checkbox formControlName="dc3Emitida" color="primary">
                            ¿Emite Constancia DC-3 (Habilidades Laborales)?
                        </mat-checkbox>
                    </div>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Agente Capacitador DC-5</mat-label>
                        <input matInput formControlName="agenteCapacitadorDc5" placeholder="Número de registro STPS" />
                    </mat-form-field>
                </div>

                <!-- Objetivo -->
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Objetivo de la Capacitación</mat-label>
                    <textarea matInput formControlName="objetivo" rows="3" placeholder="Describe los conocimientos o habilidades a adquirir..."></textarea>
                </mat-form-field>

                <!-- Actions -->
                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">
                        Cancelar
                    </button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>{{ data?.capacitacion ? 'Guardar Cambios' : 'Crear Curso' }}</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoCapacitacionComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoCapacitacionComponent>);
    private readonly _service = inject(CapacitacionService);

    form!: FormGroup;
    guardando = false;
    tipos = TIPOS_CAPACITACION;
    origenes = ORIGENES_CAPACITACION;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { capacitacion?: CapacitacionDetalle | CapacitacionResumen }) {}

    ngOnInit(): void {
        const c = this.data?.capacitacion;
        const fechaProgStr = c?.fechaProgramada ? c.fechaProgramada.substring(0, 10) : '';
        const fechaTermStr = c?.fechaTermino ? c.fechaTermino.substring(0, 10) : '';

        this.form = this._fb.group({
            competencia: [c?.competencia || '', [Validators.required, Validators.maxLength(150)]],
            areaOProceso: [c?.areaOProceso || '', [Validators.required, Validators.maxLength(150)]],
            puestoImpactado: [c?.puestoImpactado || '', [Validators.required, Validators.maxLength(150)]],
            proveedorOInstructor: [c?.proveedorOInstructor || '', [Validators.required, Validators.maxLength(150)]],
            tipo: [c?.tipo || 'Interna', [Validators.required]],
            origen: [c?.origen || 'DNC', [Validators.required]],
            razonSocial: [c?.razonSocial || 'JR Ingeniería S.A. de C.V.', [Validators.required, Validators.maxLength(150)]],
            fechaProgramada: [fechaProgStr, [Validators.required]],
            fechaTermino: [fechaTermStr],
            duracionHoras: [c?.duracionHoras ?? 8, [Validators.required, Validators.min(0.1)]],
            costoEstimado: [c?.costoEstimado ?? null],
            costoReal: [c?.costoReal ?? null],
            vigenciaMeses: [c?.vigenciaMeses ?? null],
            dc3Emitida: [c?.dc3Emitida ?? false],
            agenteCapacitadorDc5: [c?.agenteCapacitadorDc5 || ''],
            objetivo: [c?.objetivo || '', [Validators.maxLength(2000)]]
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const val = this.form.value;

        const payload = {
            ...val,
            fechaProgramada: val.fechaProgramada ? new Date(val.fechaProgramada).toISOString() : null,
            fechaTermino: val.fechaTermino ? new Date(val.fechaTermino).toISOString() : null
        };

        if (this.data?.capacitacion) {
            this._service.actualizar(this.data.capacitacion.capacitacionId, payload).subscribe({
                next: (res) => {
                    this.guardando = false;
                    this._dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando = false;
                    alert(err?.error?.mensaje || 'Error al actualizar la capacitación');
                }
            });
        } else {
            this._service.crear(payload).subscribe({
                next: (res) => {
                    this.guardando = false;
                    this._dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando = false;
                    alert(err?.error?.mensaje || 'Error al crear la capacitación');
                }
            });
        }
    }
}
