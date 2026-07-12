import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';
import { Expense } from '../models/expenses.types';
import { ExpensesService } from '../expenses.service';
import { GastoArchivoViewerModalComponent } from '../gasto-archivo-viewer-modal/gasto-archivo-viewer-modal.component';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

@Component({
    selector: 'expense-details',
    templateUrl: './expense-details.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatProgressBarModule,
        MatTooltipModule,
        MatListModule,
        CurrencyPipe,
        DatePipe
    ]
})
export class ExpenseDetailsComponent implements OnInit {
    activeTab: 'info' | 'files' = 'info';
    expense: Expense;
    proveedorNombre: string;
    archivos: string[] = [];
    isLoading: boolean = false;
    isUploading: boolean = false;
    selectedFile: File | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { expense: Expense, proveedorNombre?: string },
        public _dialogRef: MatDialogRef<ExpenseDetailsComponent>,
        private _expensesService: ExpensesService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _matDialog: MatDialog
    ) {
        this.expense = data.expense;
        this.proveedorNombre = data.proveedorNombre || data.expense.gastoProveedor?.nombre || (typeof data.expense.proveedor === 'string' ? data.expense.proveedor : 'N/A');
    }

    ngOnInit(): void {
        this.cargarArchivos();
    }

    cargarArchivos(): void {
        this.isLoading = true;
        this._expensesService.getArchivos(this.expense.gastoId)
            .pipe(finalize(() => {
                this.isLoading = false;
                this._changeDetectorRef.markForCheck();
            }))
            .subscribe({
                next: (res) => {
                    this.archivos = res || [];
                },
                error: () => {
                    Swal.fire('Error', 'No se pudieron cargar los archivos', 'error');
                }
            });
    }

    onFileSelected(event: any): void {
        const file: File = event.target.files[0];
        if (file) {
            this.selectedFile = file;
        }
    }

    subirArchivo(): void {
        if (!this.selectedFile) return;

        this.isUploading = true;
        this._expensesService.subirArchivo(this.expense.gastoId, this.selectedFile)
            .pipe(finalize(() => {
                this.isUploading = false;
                this.selectedFile = null;
                this._changeDetectorRef.markForCheck();
            }))
            .subscribe({
                next: () => {
                    Swal.fire('Éxito', 'Archivo subido correctamente', 'success');
                    this.cargarArchivos();
                },
                error: () => {
                    Swal.fire('Error', 'No se pudo subir el archivo', 'error');
                }
            });
    }

    descargarArchivo(nombre: string): void {
        this._expensesService.descargarArchivo(this.expense.gastoId, nombre).subscribe({
            next: (res) => {
                if (res && res.data) {
                    this._matDialog.open(GastoArchivoViewerModalComponent, {
                        data: {
                            base64: res.data,
                            contentType: res.contentType,
                            nombre: nombre
                        },
                        width: '90vw',
                        maxWidth: '1200px',
                        height: '90vh',
                        panelClass: 'gasto-archivo-viewer-panel'
                    });
                }
            },
            error: () => {
                Swal.fire('Error', 'No se pudo descargar el archivo', 'error');
            }
        });
    }

    eliminarArchivo(nombre: string): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Eliminarás el archivo "${nombre}" permanentemente`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._expensesService.eliminarArchivo(this.expense.gastoId, nombre).subscribe({
                    next: () => {
                        Swal.fire('Eliminado', 'El archivo ha sido eliminado', 'success');
                        this.cargarArchivos();
                    },
                    error: () => {
                        Swal.fire('Error', 'No se pudo eliminar el archivo', 'error');
                    }
                });
            }
        });
    }

    getFileIcon(nombre: string): string {
        const ext = nombre.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return 'heroicons_outline:document-text';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'heroicons_outline:photo';
        return 'heroicons_outline:document';
    }
}