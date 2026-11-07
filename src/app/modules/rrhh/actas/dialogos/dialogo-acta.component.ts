import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActasService } from '../actas.service';
import { ActaDetalle, ColaboradorActa } from '../actas.types';
import { ETIQUETAS_GRAVEDAD } from '../actas.utils';

/** Alta del acta (borrador) o edición de los hechos mientras el acta está en borrador o citada. */
@Component({
    selector: 'app-dialogo-acta',
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
        <div class="flex flex-col w-full max-w-2xl">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data.acta ? 'Editar acta ' + data.acta.folio : 'Nueva acta administrativa' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <div class="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg text-xs">
                    La carga de la prueba es del patrón: describe hechos objetivos (qué, cuándo, dónde), sin juicios,
                    y registra a los dos testigos. El patrón tiene 30 días desde que conoce los hechos (Art. 517 LFT).
                </div>

                <mat-form-field *ngIf="!data.acta" appearance="outline" class="w-full">
                    <mat-label>Colaborador</mat-label>
                    <mat-select formControlName="colaboradorId">
                        <mat-option *ngFor="let c of colaboradores" [value]="c.colaboradorId">
                            {{ c.nombre }} — {{ c.puesto || 'Sin puesto' }}
                        </mat-option>
                    </mat-select>
                    <mat-error>Selecciona al colaborador</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Fecha y hora de los hechos</mat-label>
                        <input matInput type="datetime-local" formControlName="fechaHechos" />
                        <mat-error>Indica cuándo ocurrieron</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Fecha en que se conocieron los hechos</mat-label>
                        <input matInput type="date" formControlName="fechaConocimiento" />
                        <mat-error>Indica cuándo se conocieron</mat-error>
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Lugar</mat-label>
                    <input matInput formControlName="lugar" maxlength="200" />
                    <mat-error>El lugar es obligatorio</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Tipo de falta (Art. 47 / artículo del RIT)</mat-label>
                        <input matInput formControlName="tipoFalta" maxlength="250" />
                        <mat-error>El tipo de falta es obligatorio</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Gravedad</mat-label>
                        <mat-select formControlName="gravedad">
                            <mat-option *ngFor="let g of gravedades" [value]="g">{{ etiquetaGravedad(g) }}</mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Narración objetiva de los hechos</mat-label>
                    <textarea matInput formControlName="narracion" rows="5" maxlength="4000"></textarea>
                    <mat-error>La narración es obligatoria</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Testigo 1</mat-label>
                        <input matInput formControlName="testigo1" maxlength="150" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="w-full">
                        <mat-label>Testigo 2</mat-label>
                        <input matInput formControlName="testigo2" maxlength="150" />
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Razón social (patrón)</mat-label>
                    <input matInput formControlName="razonSocial" maxlength="150" />
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>{{ data.acta ? 'Guardar cambios' : 'Crear acta' }}</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoActaComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoActaComponent>);
    private readonly _service = inject(ActasService);

    form!: FormGroup;
    guardando = false;
    colaboradores: ColaboradorActa[] = [];
    gravedades = ['Leve', 'Grave', 'CausalRescision'];

    constructor(@Inject(MAT_DIALOG_DATA) public data: { acta?: ActaDetalle }) {}

    ngOnInit(): void {
        const a = this.data.acta;
        this.form = this._fb.group({
            colaboradorId: [null, a ? [] : [Validators.required]],
            fechaHechos: [a ? a.fechaHechos.substring(0, 16) : '', [Validators.required]],
            fechaConocimiento: [a ? a.fechaConocimiento.substring(0, 10) : '', [Validators.required]],
            lugar: [a?.lugar ?? '', [Validators.required, Validators.maxLength(200)]],
            tipoFalta: [a?.tipoFalta ?? '', [Validators.required, Validators.maxLength(250)]],
            gravedad: [a?.gravedad ?? 'Leve', [Validators.required]],
            narracion: [a?.narracion ?? '', [Validators.required, Validators.maxLength(4000)]],
            testigo1: [a?.testigo1 ?? ''],
            testigo2: [a?.testigo2 ?? ''],
            razonSocial: [a?.razonSocial ?? '']
        });

        if (!a) {
            this._service.colaboradores().subscribe({
                next: (lista) => (this.colaboradores = lista),
                error: () => alert('No se pudo cargar la lista de colaboradores')
            });
        }
    }

    etiquetaGravedad(g: string): string {
        return ETIQUETAS_GRAVEDAD[g] ?? g;
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const v = this.form.value;
        const comun = {
            fechaHechos: v.fechaHechos,
            fechaConocimiento: v.fechaConocimiento,
            lugar: v.lugar.trim(),
            tipoFalta: v.tipoFalta.trim(),
            gravedad: v.gravedad,
            narracion: v.narracion.trim(),
            testigo1: v.testigo1?.trim() || null,
            testigo2: v.testigo2?.trim() || null,
            razonSocial: v.razonSocial?.trim() || null
        };

        const peticion = this.data.acta
            ? this._service.actualizar(this.data.acta.actaId, comun)
            : this._service.crear({ colaboradorId: v.colaboradorId, ...comun });

        peticion.subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo guardar el acta');
            }
        });
    }
}
