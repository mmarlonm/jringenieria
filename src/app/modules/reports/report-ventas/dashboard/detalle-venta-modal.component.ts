import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

export interface DetalleVentaData {
    folio: string;
    cliente: string;
    fecha: string;
    sucursal: string;
    total: number;
    items: any[];
}

@Component({
    selector: 'app-detalle-venta-modal',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule
    ],
    template: `
        <div class="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            <!-- Header -->
            <div class="flex flex-col px-8 py-6 border-b border-slate-700 bg-slate-800/80 relative">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <mat-icon>receipt_long</mat-icon>
                        </div>
                        <h2 class="text-2xl font-black text-white m-0 tracking-tight">Detalle de Venta</h2>
                    </div>
                    <button mat-icon-button class="text-slate-400 hover:text-white transition-colors" (click)="cerrar()">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Folio</span>
                        <span class="text-indigo-400 font-bold">{{ data.folio }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</span>
                        <span class="text-slate-200 font-medium">{{ data.fecha | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cliente</span>
                        <span class="text-slate-200 font-medium truncate" [title]="data.cliente">{{ data.cliente }}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Documento</span>
                        <span class="text-emerald-400 font-black">{{ data.total | currency:'MXN' }}</span>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="p-8 overflow-auto bg-slate-900/50" style="max-height: 65vh;">
                <table mat-table [dataSource]="data.items" class="w-full bg-transparent">
                    
                    <!-- Producto Column -->
                    <ng-container matColumnDef="producto">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-bold border-b border-slate-700 bg-transparent uppercase text-xs tracking-wider pb-4">Producto</th>
                        <td mat-cell *matCellDef="let element" class="text-slate-200 border-b border-slate-700/40 py-4 text-sm font-medium leading-relaxed">
                            {{ element.producto }}
                        </td>
                    </ng-container>

                    <!-- Cantidad Column -->
                    <ng-container matColumnDef="cantidad">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-bold border-b border-slate-700 bg-transparent text-center uppercase text-xs tracking-wider pb-4">Cant.</th>
                        <td mat-cell *matCellDef="let element" class="text-slate-300 border-b border-slate-700/40 py-4 text-center text-sm font-bold">
                            {{ element.cantidad }}
                        </td>
                    </ng-container>

                    <!-- Precio Column -->
                    <ng-container matColumnDef="precio">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-bold border-b border-slate-700 bg-transparent text-right uppercase text-xs tracking-wider pb-4">P. Unitario</th>
                        <td mat-cell *matCellDef="let element" class="text-slate-400 border-b border-slate-700/40 py-4 text-right text-xs tabular-nums">
                            {{ element.precio | currency:'MXN' }}
                        </td>
                    </ng-container>

                    <!-- Subtotal Column -->
                    <ng-container matColumnDef="netoMovimiento">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-bold border-b border-slate-700 bg-transparent text-right uppercase text-xs tracking-wider pb-4">Subtotal</th>
                        <td mat-cell *matCellDef="let element" class="text-white font-black text-right border-b border-slate-700/40 py-4 whitespace-nowrap text-sm tabular-nums">
                            {{ element.netoMovimiento | currency:'MXN' }}
                        </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-indigo-500/5 transition-colors"></tr>
                    
                    <tr class="mat-row" *matNoDataRow>
                        <td class="mat-cell text-center py-12 text-slate-500 border-b-0" colspan="4">
                            <mat-icon class="text-slate-700 scale-150 mb-2">content_paste_off</mat-icon>
                            <p>No se encontraron partidas para este folio.</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Footer -->
            <div class="px-8 py-5 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
                <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {{ data.items.length }} Partidas registradas
                </div>
                <button mat-flat-button class="!bg-indigo-600 hover:!bg-indigo-700 !text-white !rounded-lg font-bold px-6" (click)="cerrar()">
                    Cerrar Detalle
                </button>
            </div>
        </div>
    `,
    styles: [`
        ::ng-deep .cdk-overlay-pane {
            max-width: 95vw !important;
            width: 900px !important;
        }
        ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface { 
            background: transparent !important; 
            box-shadow: none !important;
            border-radius: 1rem !important;
        }
        .mat-mdc-table {
            background: transparent !important;
        }
        .mat-mdc-header-row {
            height: auto !important;
        }
    `]
})
export class DetalleVentaModalComponent implements OnInit {
    displayedColumns: string[] = ['producto', 'cantidad', 'precio', 'netoMovimiento'];

    constructor(
        public dialogRef: MatDialogRef<DetalleVentaModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DetalleVentaData
    ) { }

    ngOnInit(): void {
    }

    cerrar(): void {
        this.dialogRef.close();
    }
}
