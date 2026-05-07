import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'surtido-detalle-dialog',
    template: `
        <div class="flex flex-col max-h-[80vh] min-w-[500px]">
            <div class="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
                <div class="flex flex-col">
                    <h2 class="text-lg font-bold text-gray-800 m-0">Detalle de Surtidos</h2>
                    <p class="text-sm text-gray-500 m-0">{{ data.material.descripcion }}</p>
                </div>
                <button mat-icon-button (click)="close()">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <div class="p-6 overflow-y-auto">
                <table mat-table [dataSource]="dataSource" class="w-full">
                    <ng-container matColumnDef="fecha">
                        <th mat-header-cell *matHeaderCellDef class="font-bold"> Fecha </th>
                        <td mat-cell *matCellDef="let element"> {{ element.fechaEntrega | date:'dd/MM/yyyy HH:mm' }} </td>
                    </ng-container>

                    <ng-container matColumnDef="cantidad">
                        <th mat-header-cell *matHeaderCellDef class="font-bold"> Cantidad </th>
                        <td mat-cell *matCellDef="let element"> {{ element.cantidadEntregada }} </td>
                    </ng-container>

                    <ng-container matColumnDef="guia">
                        <th mat-header-cell *matHeaderCellDef class="font-bold"> Guía </th>
                        <td mat-cell *matCellDef="let element"> 
                            <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                                {{ element.guia || 'N/A' }}
                            </span>
                        </td>
                    </ng-container>

                    <ng-container matColumnDef="usuario">
                        <th mat-header-cell *matHeaderCellDef class="font-bold"> Usuario </th>
                        <td mat-cell *matCellDef="let element"> {{ element.nombreUsuario || 'S/U' }} </td>
                    </ng-container>

                    <ng-container matColumnDef="observaciones">
                        <th mat-header-cell *matHeaderCellDef class="font-bold"> Observaciones </th>
                        <td mat-cell *matCellDef="let element"> 
                            <p class="text-xs text-gray-600 italic m-0">{{ element.observaciones || 'Sin observaciones' }}</p>
                        </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                </table>

                <div *ngIf="dataSource.data.length === 0" class="py-10 text-center text-gray-500">
                    No hay historial de surtidos para este producto.
                </div>
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t text-right">
                <button mat-flat-button color="primary" (click)="close()">Cerrar</button>
            </div>
        </div>
    `,
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatTableModule
    ]
})
export class SurtidoDetalleDialogComponent {
    dataSource: MatTableDataSource<any>;
    displayedColumns: string[] = ['fecha', 'cantidad', 'guia', 'usuario', 'observaciones'];

    constructor(
        public dialogRef: MatDialogRef<SurtidoDetalleDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { material: any }
    ) {
        this.dataSource = new MatTableDataSource(data.material.historialSurtidos || []);
    }

    close(): void {
        this.dialogRef.close();
    }
}
