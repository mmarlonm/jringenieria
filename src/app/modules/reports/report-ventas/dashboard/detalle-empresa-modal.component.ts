import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

export interface DetalleEmpresaData {
    titulo: string;
    subtitulo: string;
    facturas: any[];
}

@Component({
    selector: 'app-detalle-empresa-modal',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule
    ],
    template: `
        <div class="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80">
                <div>
                    <h2 class="text-xl font-bold text-white m-0 tracking-wide">{{ data.titulo }}</h2>
                    <p class="text-sm text-slate-400 m-0 mt-1">{{ data.subtitulo }} ({{ data.facturas.length }} registros)</p>
                </div>
                <button mat-icon-button class="text-slate-400 hover:text-white transition-colors" (click)="cerrar()">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <!-- Content -->
            <div class="p-6 overflow-auto bg-slate-900/50" style="max-height: 70vh;">
                <table mat-table [dataSource]="data.facturas" class="w-full bg-transparent">
                    
                    <!-- Fecha Column -->
                    <ng-container matColumnDef="fecha">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-semibold border-b border-slate-700 bg-slate-800/80 uppercase text-xs tracking-wider">Fecha</th>
                        <td mat-cell *matCellDef="let element" class="text-slate-200 border-b border-slate-700/50 whitespace-nowrap text-sm">
                            {{ element.fecha | date:'dd/MM/yyyy' }}
                        </td>
                    </ng-container>

                    <!-- Folio Column -->
                    <ng-container matColumnDef="folio">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-semibold border-b border-slate-700 bg-slate-800/80 uppercase text-xs tracking-wider">Folio</th>
                        <td mat-cell *matCellDef="let element" class="text-white font-medium border-b border-slate-700/50 text-sm">
                            {{ element.folio }}
                        </td>
                    </ng-container>

                    <!-- Cliente Column -->
                    <ng-container matColumnDef="cliente">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-semibold border-b border-slate-700 bg-slate-800/80 uppercase text-xs tracking-wider">Cliente</th>
                        <td mat-cell *matCellDef="let element" class="text-slate-200 border-b border-slate-700/50 text-sm">
                            {{ element.cliente }}
                        </td>
                    </ng-container>

                    <!-- Vendedor Column -->
                    <ng-container matColumnDef="vendedor">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-semibold border-b border-slate-700 bg-slate-800/80 uppercase text-xs tracking-wider">Vendedor</th>
                        <td mat-cell *matCellDef="let element" class="text-slate-300 border-b border-slate-700/50 text-sm">
                            {{ element.vendedor }}
                        </td>
                    </ng-container>

                    <!-- Producto Column -->
                    <ng-container matColumnDef="producto">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-semibold border-b border-slate-700 bg-slate-800/80 uppercase text-xs tracking-wider">Detalle</th>
                        <td mat-cell *matCellDef="let element" class="text-slate-400 text-xs border-b border-slate-700/50 max-w-[200px] truncate" [title]="element.producto">
                            {{ element.producto }}
                        </td>
                    </ng-container>

                    <!-- Monto Column -->
                    <ng-container matColumnDef="totalDocumento">
                        <th mat-header-cell *matHeaderCellDef class="text-slate-400 font-semibold border-b border-slate-700 bg-slate-800/80 text-right uppercase text-xs tracking-wider">Monto</th>
                        <td mat-cell *matCellDef="let element" class="text-white font-bold text-right border-b border-slate-700/50 whitespace-nowrap text-sm">
                            {{ element.totalDocumento | currency:'MXN' }}
                        </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-slate-800/30 transition-colors"></tr>
                    
                    <tr class="mat-row" *matNoDataRow>
                        <td class="mat-cell text-center py-8 text-slate-500 border-b-0" colspan="6">
                            No se encontraron facturas con esta categorización en este rango.
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Footer -->
            <div class="px-6 py-4 bg-slate-800/80 border-t border-slate-700 flex justify-end">
                <button mat-button class="text-slate-300 hover:text-white" (click)="cerrar()">Cerrar Vista</button>
            </div>
        </div>
    `,
    styles: [`
        ::ng-deep .cdk-overlay-pane {
            max-width: 90vw !important;
            width: 1000px !important;
        }
        ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface { 
            background: transparent !important; 
            box-shadow: none !important;
        }
        .mat-mdc-table {
            background: transparent !important;
        }
    `]
})
export class DetalleEmpresaModalComponent implements OnInit {
    displayedColumns: string[] = ['folio', 'fecha', 'cliente', 'vendedor', 'producto', 'totalDocumento'];

    constructor(
        public dialogRef: MatDialogRef<DetalleEmpresaModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DetalleEmpresaData
    ) { }

    ngOnInit(): void {
    }

    cerrar(): void {
        this.dialogRef.close();
    }
}
