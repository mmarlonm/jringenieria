import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ContpaqiMaterialDto } from '../../models/solicitud-compra.types';

@Component({
    selector: 'importar-materiales-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatTableModule,
        MatCheckboxModule,
        MatIconModule
    ],
    template: `
        <div class="flex flex-col max-w-5xl h-[80vh]">
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b bg-gray-50 dark:bg-gray-800 rounded-t-xl">
                <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600">
                        <mat-icon [svgIcon]="'heroicons_outline:cloud-arrow-down'"></mat-icon>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold leading-none">Importar Materiales</h2>
                        <p class="text-sm text-secondary mt-1">Selecciona los productos detectados en CONTPAQi para el folio: <b>{{ data.folio }}</b></p>
                    </div>
                </div>
                <button mat-icon-button (click)="cancelar()">
                    <mat-icon [svgIcon]="'heroicons_outline:x-mark'"></mat-icon>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-auto overflow-y-auto p-4">
                <table mat-table [dataSource]="materiales" class="w-full">
                    
                    <!-- Checkbox Column -->
                    <ng-container matColumnDef="select">
                        <th mat-header-cell *matHeaderCellDef class="w-12">
                            <mat-checkbox (change)="$event ? masterToggle() : null"
                                          [checked]="isAllSelected()"
                                          [indeterminate]="isSomeSelected()">
                            </mat-checkbox>
                        </th>
                        <td mat-cell *matCellDef="let row">
                            <mat-checkbox (click)="$event.stopPropagation()"
                                          (change)="$event ? row.selected = !row.selected : null"
                                          [checked]="row.selected">
                            </mat-checkbox>
                        </td>
                    </ng-container>

                    <!-- Material Column -->
                    <ng-container matColumnDef="materialServicio">
                        <th mat-header-cell *matHeaderCellDef class="px-3">Material</th>
                        <td mat-cell *matCellDef="let row" class="px-3">
                            <span class="font-bold text-sm">{{ row.materialServicio }}</span>
                        </td>
                    </ng-container>

                    <!-- Description Column -->
                    <ng-container matColumnDef="descripcion">
                        <th mat-header-cell *matHeaderCellDef class="px-3">Descripción</th>
                        <td mat-cell *matCellDef="let row" class="px-3 text-xs text-secondary italic">
                            {{ row.descripcion }}
                        </td>
                    </ng-container>

                    <!-- Unit Column -->
                    <ng-container matColumnDef="unidad">
                        <th mat-header-cell *matHeaderCellDef class="text-center px-3">Unidad</th>
                        <td mat-cell *matCellDef="let row" class="text-center px-3 text-sm">
                            <span class="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold text-[10px]">
                                {{ row.unidad }}
                            </span>
                        </td>
                    </ng-container>

                    <!-- Quantity Column -->
                    <ng-container matColumnDef="cantidad">
                        <th mat-header-cell *matHeaderCellDef class="text-center px-3">Cant.</th>
                        <td mat-cell *matCellDef="let row" class="text-center px-3 font-medium">
                            {{ row.cantidad | number:'1.0-2' }}
                        </td>
                    </ng-container>

                    <!-- Cost Column -->
                    <ng-container matColumnDef="costoUnitario">
                        <th mat-header-cell *matHeaderCellDef class="text-right px-3">Costo U.</th>
                        <td mat-cell *matCellDef="let row" class="text-right px-3 tabular-nums">
                            {{ row.costoUnitario | currency }}
                        </td>
                    </ng-container>

                    <!-- IVA Column -->
                    <ng-container matColumnDef="iva">
                        <th mat-header-cell *matHeaderCellDef class="text-right px-3">IVA (16%)</th>
                        <td mat-cell *matCellDef="let row" class="text-right px-3 text-secondary tabular-nums">
                            {{ row.iva | currency }}
                        </td>
                    </ng-container>

                    <!-- Total Column -->
                    <ng-container matColumnDef="total">
                        <th mat-header-cell *matHeaderCellDef class="text-right px-3 font-bold">Total</th>
                        <td mat-cell *matCellDef="let row" class="text-right px-3 font-black text-indigo-600 tabular-nums">
                            {{ row.total | currency }}
                        </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true" class="bg-gray-50 uppercase text-[10px] tracking-wider"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                        (click)="row.selected = !row.selected"
                        class="hover:bg-gray-50 cursor-pointer transition-colors"
                        [class.bg-indigo-50]="row.selected"></tr>
                </table>

                <div *ngIf="materiales.length === 0" class="flex flex-col items-center justify-center p-12 text-center text-secondary">
                    <mat-icon class="icon-size-12 mb-2 opacity-30" [svgIcon]="'heroicons_outline:document-search'"></mat-icon>
                    <p>No se encontraron partidas para importar.</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end p-6 border-t gap-3 rounded-b-xl">
                <button mat-stroked-button (click)="cancelar()">
                    Cancelar
                </button>
                <button mat-flat-button color="primary" 
                        [disabled]="!someSelected()"
                        (click)="aceptar()">
                    Aceptar e Importar ({{ getSelectedCount() }})
                </button>
            </div>
        </div>
    `,
    encapsulation: ViewEncapsulation.None
})
export class ImportarMaterialesDialogComponent implements OnInit {
    materiales: ContpaqiMaterialDto[] = [];
    displayedColumns: string[] = ['select', 'materialServicio', 'descripcion', 'unidad', 'cantidad', 'costoUnitario', 'iva', 'total'];

    constructor(
        public dialogRef: MatDialogRef<ImportarMaterialesDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { materiales: ContpaqiMaterialDto[], folio: string }
    ) {
        // Inicializar con todos seleccionados por defecto
        this.materiales = data.materiales.map(m => ({ ...m, selected: true }));
    }

    ngOnInit(): void {}

    isAllSelected(): boolean {
        return this.materiales.length > 0 && this.materiales.every(m => m.selected);
    }

    isSomeSelected(): boolean {
        return this.materiales.some(m => m.selected) && !this.isAllSelected();
    }

    someSelected(): boolean {
        return this.materiales.some(m => m.selected);
    }

    getSelectedCount(): number {
        return this.materiales.filter(m => m.selected).length;
    }

    masterToggle(): void {
        const allSelected = this.isAllSelected();
        this.materiales.forEach(m => m.selected = !allSelected);
    }

    aceptar(): void {
        const selected = this.materiales.filter(m => m.selected);
        this.dialogRef.close(selected);
    }

    cancelar(): void {
        this.dialogRef.close();
    }
}
