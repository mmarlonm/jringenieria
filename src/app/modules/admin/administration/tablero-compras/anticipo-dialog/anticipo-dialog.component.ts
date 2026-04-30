import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatLuxonDateModule } from '@angular/material-luxon-adapter';
import { DateTime } from 'luxon';

@Component({
    selector: 'anticipo-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDatepickerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatLuxonDateModule
    ],
    template: `
        <div class="flex flex-col max-w-160 w-full">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b bg-gray-50 dark:bg-gray-800">
                <div class="flex items-center">
                    <mat-icon class="text-amber-500 mr-2" [svgIcon]="'heroicons_outline:cash'"></mat-icon>
                    <h2 class="text-lg font-semibold tracking-tight">Registrar Anticipo</h2>
                </div>
                <button mat-icon-button (click)="onNoClick()" [tabIndex]="-1">
                    <mat-icon [svgIcon]="'heroicons_outline:x'"></mat-icon>
                </button>
            </div>

            <!-- Content -->
            <form [formGroup]="anticipoForm" (ngSubmit)="onSave()" class="flex flex-col p-6 space-y-4">
                <div class="flex flex-col sm:flex-row gap-4">
                    <mat-form-field appearance="outline" class="flex-auto">
                        <mat-label>Monto del Anticipo</mat-label>
                        <input matInput type="number" formControlName="monto" placeholder="0.00" min="0">
                        <mat-icon matSuffix [svgIcon]="'heroicons_outline:currency-dollar'"></mat-icon>
                        <mat-error *ngIf="anticipoForm.get('monto').hasError('required')">El monto es obligatorio</mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="flex-auto">
                        <mat-label>Fecha Programada</mat-label>
                        <input matInput [matDatepicker]="picker" formControlName="fechaProgramada">
                        <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                        <mat-datepicker #picker></mat-datepicker>
                        <mat-error *ngIf="anticipoForm.get('fechaProgramada').hasError('required')">La fecha es obligatoria</mat-error>
                    </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Comentarios</mat-label>
                    <textarea matInput formControlName="comentarios" rows="3" placeholder="Detalles sobre el anticipo..."></textarea>
                </mat-form-field>

                <div class="flex items-center justify-end pt-4 border-t gap-2">
                    <button mat-button type="button" (click)="onNoClick()">Cancelar</button>
                    <button mat-flat-button color="primary" [disabled]="anticipoForm.invalid">
                        <mat-icon class="mr-2 icon-size-5">check</mat-icon>
                        Confirmar Anticipo
                    </button>
                </div>
            </form>
        </div>
    `
})
export class AnticipoDialogComponent implements OnInit {
    anticipoForm: FormGroup;

    constructor(
        public dialogRef: MatDialogRef<AnticipoDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _formBuilder: FormBuilder
    ) { }

    ngOnInit(): void {
        this.anticipoForm = this._formBuilder.group({
            monto: [this.data.monto || '', [Validators.required, Validators.min(1)]],
            fechaProgramada: [DateTime.now(), Validators.required],
            comentarios: ['']
        });
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.anticipoForm.invalid) return;
        
        const formValue = this.anticipoForm.value;
        const result = {
            monto: formValue.monto,
            fechaProgramada: formValue.fechaProgramada.toJSDate ? formValue.fechaProgramada.toJSDate() : formValue.fechaProgramada,
            comentarios: formValue.comentarios
        };
        
        this.dialogRef.close(result);
    }
}
