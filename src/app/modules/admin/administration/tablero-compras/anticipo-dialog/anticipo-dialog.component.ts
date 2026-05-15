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
                    <textarea matInput formControlName="comentarios" rows="2" placeholder="Detalles sobre el anticipo..."></textarea>
                </mat-form-field>

                <div class="flex flex-col space-y-3">
                    <div class="flex items-center justify-between">
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comprobantes / Cotizaciones <span class="text-gray-300 font-normal italic">(Opcional)</span></label>
                        <button type="button" mat-button color="primary" class="h-8 text-[11px] font-bold" (click)="fileInput.click()">
                            <mat-icon class="icon-size-4 mr-1" [svgIcon]="'heroicons_outline:plus'"></mat-icon>
                            Añadir Archivo
                        </button>
                    </div>

                    <!-- Selected Files List -->
                    <div *ngIf="archivos.length > 0" class="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        <div *ngFor="let file of archivos; let i = index"
                             class="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200 group">
                            <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                <mat-icon class="icon-size-4" [svgIcon]="'heroicons_outline:document-text'"></mat-icon>
                            </div>
                            <div class="flex flex-col flex-1 min-w-0">
                                <span class="text-xs font-bold text-gray-700 truncate">{{ file.name }}</span>
                                <span class="text-[9px] text-amber-600 font-medium uppercase tracking-wider">Listo para subir</span>
                            </div>
                            <button type="button" mat-icon-button (click)="removeFile(i)" class="w-7 h-7 min-h-7 text-gray-400 hover:text-red-500 transition-colors">
                                <mat-icon class="icon-size-4" [svgIcon]="'heroicons_outline:trash'"></mat-icon>
                            </button>
                        </div>
                    </div>

                    <!-- Drop Zone / Initial State -->
                    <div *ngIf="archivos.length === 0" 
                         class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-amber-400 cursor-pointer transition-all group"
                         (click)="fileInput.click()">
                        <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-500 transition-all">
                            <mat-icon class="icon-size-6" [svgIcon]="'heroicons_outline:cloud-arrow-up'"></mat-icon>
                        </div>
                        <p class="mt-2 text-xs font-bold text-gray-500">Haz clic para adjuntar comprobantes</p>
                        <p class="text-[10px] text-gray-400 mt-0.5">PDF, Imágenes (Máx. 10MB)</p>
                    </div>

                    <input type="file" #fileInput class="hidden" (change)="onFilesSelected($event)" multiple accept=".pdf,.jpg,.jpeg,.png">
                </div>

                <div class="flex items-center justify-end pt-4 border-t gap-2">
                    <button mat-button type="button" (click)="onNoClick()">Cancelar</button>
                    <button mat-flat-button color="primary" [disabled]="anticipoForm.invalid" class="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6">
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
    archivos: File[] = [];

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

    onFilesSelected(event: any): void {
        const files: FileList = event.target.files;
        if (files) {
            for (let i = 0; i < files.length; i++) {
                this.archivos.push(files.item(i));
            }
        }
    }

    removeFile(index: number): void {
        this.archivos.splice(index, 1);
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
            comentarios: formValue.comentarios,
            archivos: this.archivos
        };
        
        this.dialogRef.close(result);
    }
}
