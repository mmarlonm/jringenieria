import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { OffboardingService } from '../offboarding.service';
import { CausaBaja, ColaboradorBaja, OffboardingDetalle } from '../offboarding.types';
import { aFechaInput, etiquetaCausa, hoyIso } from '../offboarding.utils';

/** Abre un caso de baja o edita los datos de uno abierto. */
@Component({
    selector: 'app-dialogo-baja',
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
        <div class="flex flex-col w-full max-w-xl">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data.baja ? 'Editar baja ' + data.baja.folio : 'Nueva baja de colaborador' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div class="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs">
                    La salida del colaborador no se condiciona a firmas: ninguna tarea del checklist detiene la baja.
                </div>

                <mat-form-field *ngIf="!data.baja" appearance="outline" class="w-full">
                    <mat-label>Colaborador</mat-label>
                    <mat-select formControlName="colaboradorId">
                        <mat-option *ngFor="let c of colaboradores" [value]="c.colaboradorId">
                            {{ c.nombre }} — {{ c.puesto || 'Sin puesto' }}
                        </mat-option>
                    </mat-select>
                    <mat-hint *ngIf="colaboradoresCargados && colaboradores.length === 0" class="!text-amber-700">No hay colaboradores activos. Solo se da de baja a quien ya está activo: actívalo en RRHH › Colaboradores.</mat-hint>
                    <mat-error>Selecciona al colaborador</mat-error>
                </mat-form-field>

                <mat-form-field *ngIf="!data.baja" appearance="outline" class="w-full">
                    <mat-label>Causa de baja</mat-label>
                    <mat-select formControlName="causa">
                        <mat-option *ngFor="let c of causas" [value]="c.codigo">
                            {{ etiquetaCausa(c.codigo) }} (ruta {{ c.ruta }})
                        </mat-option>
                    </mat-select>
                    <mat-error>Selecciona la causa</mat-error>
                </mat-form-field>

                <div *ngIf="esDespidoJustificado && !data.baja"
                     class="p-3 rounded-lg text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                    El despido justificado requiere un acta administrativa cerrada con rescisión de este colaborador (Art. 47).
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Último día laborado</mat-label>
                    <input matInput type="date" formControlName="ultimoDiaLaborado" />
                    <mat-error>El último día laborado es obligatorio</mat-error>
                </mat-form-field>

                <mat-form-field *ngIf="esDespidoJustificado" appearance="outline" class="w-full">
                    <mat-label>Fecha del aviso de rescisión (opcional)</mat-label>
                    <input matInput type="date" formControlName="fechaAvisoRescision" />
                    <mat-hint>De aquí corren los 5 días hábiles para notificar al Tribunal si no lo recibe</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Razón social (patrón)</mat-label>
                    <input matInput formControlName="razonSocial" maxlength="150" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Notas</mat-label>
                    <textarea matInput formControlName="notas" rows="3" maxlength="1000"></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>{{ data.baja ? 'Guardar cambios' : 'Abrir baja' }}</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoBajaComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoBajaComponent>);
    private readonly _service = inject(OffboardingService);

    form!: FormGroup;
    guardando = false;
    colaboradores: ColaboradorBaja[] = [];
    colaboradoresCargados = false;
    causas: CausaBaja[] = [];
    readonly etiquetaCausa = etiquetaCausa;

    constructor(@Inject(MAT_DIALOG_DATA) public data: { baja?: OffboardingDetalle }) {}

    get esDespidoJustificado(): boolean {
        return this.data.baja ? this.data.baja.ruta === 3 : this.form?.value.causa === 'DespidoJustificado';
    }

    ngOnInit(): void {
        const b = this.data.baja;
        this.form = this._fb.group({
            colaboradorId: [null, b ? [] : [Validators.required]],
            causa: [b?.causa ?? '', b ? [] : [Validators.required]],
            ultimoDiaLaborado: [b ? aFechaInput(b.ultimoDiaLaborado) : hoyIso(), [Validators.required]],
            fechaAvisoRescision: [b ? aFechaInput(b.fechaAvisoRescision) : ''],
            razonSocial: [b?.razonSocial ?? ''],
            notas: [b?.notas ?? '']
        });

        if (!b) {
            this._service.catalogos().subscribe({ next: (c) => (this.causas = c.causas) });
            this._service.colaboradores().subscribe({
                next: (lista) => {
                    this.colaboradores = lista;
                    this.colaboradoresCargados = true;
                },
                error: () => alert('No se pudo cargar la lista de colaboradores')
            });
        }
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const v = this.form.value;
        const comun = {
            ultimoDiaLaborado: v.ultimoDiaLaborado,
            fechaAvisoRescision: v.fechaAvisoRescision || null,
            razonSocial: v.razonSocial?.trim() || null,
            notas: v.notas?.trim() || null
        };

        const peticion = this.data.baja
            ? this._service.actualizar(this.data.baja.bajaId, comun)
            : this._service.abrir({ colaboradorId: v.colaboradorId, causa: v.causa, ...comun });

        peticion.subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo guardar la baja');
            }
        });
    }
}
