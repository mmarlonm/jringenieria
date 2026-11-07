import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DesempenoService } from '../desempeno.service';
import { MatrizCompetencia } from '../desempeno.types';

/** Define el nivel requerido (0 a 4) de una competencia para un puesto. Si ya existe, se actualiza. */
@Component({
    selector: 'app-dialogo-matriz',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, MatIconModule],
    template: `
        <div class="flex flex-col w-full max-w-lg">
            <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    {{ data.fila ? 'Editar competencia del puesto' : 'Nueva competencia requerida' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                </button>
            </div>

            <form [formGroup]="form" (ngSubmit)="guardar()" class="flex flex-col gap-3 pt-4">
                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Puesto</mat-label>
                    <input matInput formControlName="puesto" [matAutocomplete]="auto" maxlength="150" />
                    <mat-autocomplete #auto="matAutocomplete">
                        <mat-option *ngFor="let p of puestosFiltrados" [value]="p">{{ p }}</mat-option>
                    </mat-autocomplete>
                    <mat-error>El puesto es obligatorio</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Competencia</mat-label>
                    <input matInput formControlName="competencia" maxlength="150" />
                    <mat-error>La competencia es obligatoria</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Nivel requerido (0 a 4)</mat-label>
                    <mat-select formControlName="nivelRequerido">
                        <mat-option *ngFor="let n of niveles" [value]="n">{{ n }}</mat-option>
                    </mat-select>
                    <mat-error>Indica el nivel requerido</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Descripción</mat-label>
                    <textarea matInput formControlName="descripcion" rows="2" maxlength="500"></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button mat-button type="button" mat-dialog-close [disabled]="guardando">Cancelar</button>
                    <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || guardando">
                        <mat-icon *ngIf="guardando" svgIcon="heroicons_outline:arrow-path" class="animate-spin mr-2"></mat-icon>
                        <span>Guardar</span>
                    </button>
                </div>
            </form>
        </div>
    `
})
export class DialogoMatrizComponent implements OnInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject(MatDialogRef<DialogoMatrizComponent>);
    private readonly _service = inject(DesempenoService);

    form!: FormGroup;
    guardando = false;
    puestos: string[] = [];
    readonly niveles = [0, 1, 2, 3, 4];

    constructor(@Inject(MAT_DIALOG_DATA) public data: { fila?: MatrizCompetencia; puestoInicial?: string }) {}

    get puestosFiltrados(): string[] {
        const t = (this.form?.value.puesto ?? '').toString().trim().toLowerCase();
        return t ? this.puestos.filter((p) => p.toLowerCase().includes(t)) : this.puestos;
    }

    ngOnInit(): void {
        const f = this.data.fila;
        this.form = this._fb.group({
            puesto: [f?.puesto ?? this.data.puestoInicial ?? '', [Validators.required, Validators.maxLength(150)]],
            competencia: [f?.competencia ?? '', [Validators.required, Validators.maxLength(150)]],
            nivelRequerido: [f?.nivelRequerido ?? null, [Validators.required]],
            descripcion: [f?.descripcion ?? '']
        });
        this._service.puestos().subscribe({ next: (p) => (this.puestos = p), error: () => (this.puestos = []) });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando = true;
        const v = this.form.value;
        this._service.guardarMatriz({
            puesto: v.puesto.trim(),
            competencia: v.competencia.trim(),
            nivelRequerido: Number(v.nivelRequerido),
            descripcion: v.descripcion?.trim() || null
        }).subscribe({
            next: (res) => {
                this.guardando = false;
                this._dialogRef.close(res);
            },
            error: (err) => {
                this.guardando = false;
                alert(err?.error?.mensaje || 'No se pudo guardar la competencia');
            }
        });
    }
}
