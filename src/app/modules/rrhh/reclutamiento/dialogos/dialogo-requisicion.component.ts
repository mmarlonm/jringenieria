import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReclutamientoService } from '../reclutamiento.service';
import { CatalogosReclutamiento, RequisicionDetalle } from '../reclutamiento.types';

@Component({
    selector: 'app-dialogo-requisicion',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule
    ],
    template: `
        <div class="flex flex-col max-w-2xl w-full">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data?.requisicion ? 'Editar Requisición ' + data.requisicion.folio : 'Nueva Requisición de Personal' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-4 pt-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Puesto Requerido</mat-label>
                        <input matInput formControlName="puesto" placeholder="Ej. Desarrollador Fullstack" />
                        <mat-error *ngIf="form.get('puesto')?.hasError('required')">El puesto es obligatorio</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Área o Solicitante</mat-label>
                        <input matInput formControlName="areaOSolicitante" placeholder="Ej. Tecnología / Ing. Pérez" />
                        <mat-error *ngIf="form.get('areaOSolicitante')?.hasError('required')">El área es obligatoria</mat-error>
                    </mat-form-field>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Tipo de Vacante</mat-label>
                        <mat-select formControlName="tipo">
                            <mat-option value="Sustitucion">Sustitución</mat-option>
                            <mat-option value="NuevaCreacion">Nueva creación</mat-option>
                            <mat-option value="Temporal">Temporal</mat-option>
                            <mat-option value="Cobertura">Cobertura</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Sucursal</mat-label>
                        <mat-select formControlName="sucursalId">
                            <mat-option [value]="null">Sin sucursal asignada</mat-option>
                            <mat-option *ngFor="let s of catalogos?.sucursales" [value]="s.sucursalId">{{ s.nombre }}</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Número de Plazas</mat-label>
                        <input matInput type="number" min="1" formControlName="numeroPlazas" />
                    </mat-form-field>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Razón Social que Contrata</mat-label>
                        <input matInput formControlName="razonSocial" placeholder="Ej. JR Ingeniería S.A. de C.V." />
                        <mat-error *ngIf="form.get('razonSocial')?.hasError('required')">La razón social es obligatoria</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Salario Propuesto (Mensual)</mat-label>
                        <input matInput type="number" formControlName="salarioPropuesto" placeholder="0.00" />
                    </mat-form-field>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Centro de Costos</mat-label>
                        <input matInput formControlName="centroCostos" placeholder="Ej. CC-OPER-01" />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Duración de Contrato Propuesta</mat-label>
                        <input matInput formControlName="duracionContratoPropuesta" placeholder="Ej. Indeterminado / 3 meses prueba" />
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Perfil Requerido / Requisitos del Puesto</mat-label>
                    <textarea matInput formControlName="perfilRequerido" rows="3" placeholder="Experiencia mínima, habilidades, escolaridad, herramientas..."></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close>Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        {{ guardando ? 'Guardando...' : (data?.requisicion ? 'Actualizar' : 'Crear Requisición') }}
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoRequisicionComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoRequisicionComponent>);
    private readonly _service = inject(ReclutamientoService);

    form!: FormGroup;
    catalogos: CatalogosReclutamiento | null = null;
    guardando = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { requisicion?: RequisicionDetalle }) {}

    ngOnInit(): void {
        this.form = this._fb.group({
            puesto: [this.data?.requisicion?.puesto || '', [Validators.required, Validators.maxLength(150)]],
            areaOSolicitante: [this.data?.requisicion?.areaOSolicitante || '', [Validators.required, Validators.maxLength(150)]],
            tipo: [this.data?.requisicion?.tipo || 'Sustitucion', [Validators.required]],
            sucursalId: [this.data?.requisicion?.sucursalId || null],
            numeroPlazas: [this.data?.requisicion?.numeroPlazas || 1, [Validators.required, Validators.min(1)]],
            razonSocial: [this.data?.requisicion?.razonSocial || 'JR Ingeniería S.A. de C.V.', [Validators.required]],
            salarioPropuesto: [this.data?.requisicion?.salarioPropuesto || null],
            centroCostos: [this.data?.requisicion?.centroCostos || ''],
            duracionContratoPropuesta: [this.data?.requisicion?.duracionContratoPropuesta || ''],
            perfilRequerido: [this.data?.requisicion?.perfilRequerido || '']
        });

        this._service.catalogos().subscribe({
            next: (c) => this.catalogos = c
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const val = this.form.value;

        if (this.data?.requisicion) {
            this._service.actualizarRequisicion(this.data.requisicion.requisicionId, {
                ...val,
                plazasCubiertas: this.data.requisicion.plazasCubiertas,
                fechaIngresoAcordada: this.data.requisicion.fechaIngresoAcordada
            }).subscribe({
                next: (res) => {
                    this.guardando = false;
                    this._dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando = false;
                    alert(err?.error?.mensaje || 'Error al actualizar la requisición');
                }
            });
        } else {
            this._service.crearRequisicion(val).subscribe({
                next: (res) => {
                    this.guardando = false;
                    this._dialogRef.close(res);
                },
                error: (err) => {
                    this.guardando = false;
                    alert(err?.error?.mensaje || 'Error al crear la requisición');
                }
            });
        }
    }
}

