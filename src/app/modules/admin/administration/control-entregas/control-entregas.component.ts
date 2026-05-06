import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { ControlEntregasService } from './control-entregas.service';
import { MaestroEntregaDto } from './models/control-entregas.types';
import { DetalleEntregaDialogComponent } from './dialogs/detalle-entrega-dialog/detalle-entrega-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'control-entregas',
    templateUrl: './control-entregas.component.html',
    styleUrls: ['./control-entregas.component.scss'],
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatTableModule,
        MatTooltipModule,
        MatDialogModule,
        MatProgressSpinnerModule
    ]
})
export class ControlEntregasComponent implements OnInit, OnDestroy {
    
    dataSource: MatTableDataSource<MaestroEntregaDto> = new MatTableDataSource();
    displayedColumns: string[] = ['folio', 'cliente', 'avance', 'estatus', 'acciones'];
    
    isLoading: boolean = false;
    folioSearch: string = '';
    
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _controlEntregasService: ControlEntregasService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.cargarMaestro();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    cargarMaestro(): void {
        this.isLoading = true;
        this._controlEntregasService.obtenerMaestroEntregas()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (data) => {
                    this.dataSource.data = data;
                    this.isLoading = false;
                },
                error: () => {
                    this.isLoading = false;
                    Swal.fire('Error', 'No se pudo cargar la información maestra.', 'error');
                }
            });
    }

    sincronizarNuevo(): void {
        const dialogRef = this._dialog.open(DetalleEntregaDialogComponent, {
            data: { folio: '', readOnly: false },
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            autoFocus: false,
            panelClass: 'custom-dialog-container'
        });

        dialogRef.afterClosed().subscribe(() => {
            this.cargarMaestro();
        });
    }

    verDetalle(folio: string): void {
        const dialogRef = this._dialog.open(DetalleEntregaDialogComponent, {
            data: { folio, readOnly: true },
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            autoFocus: false,
            panelClass: 'custom-dialog-container'
        });

        dialogRef.afterClosed().subscribe(() => {
            this.cargarMaestro();
        });
    }

    editar(row: MaestroEntregaDto): void {
        const dialogRef = this._dialog.open(DetalleEntregaDialogComponent, {
            data: { folio: row.folio, readOnly: false },
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            autoFocus: false,
            panelClass: 'custom-dialog-container'
        });

        dialogRef.afterClosed().subscribe(() => {
            this.cargarMaestro();
        });
    }

    eliminar(row: MaestroEntregaDto): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará la configuración para el folio ${row.folio}. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.isLoading = true;
                this._controlEntregasService.eliminarConfiguracion(row.idFacturaMaestro).subscribe({
                    next: () => {
                        this.isLoading = false;
                        Swal.fire('Eliminado', 'La configuración ha sido eliminada.', 'success');
                        this.cargarMaestro();
                    },
                    error: (err) => {
                        this.isLoading = false;
                        Swal.fire('Error', 'No se pudo eliminar la configuración.', 'error');
                    }
                });
            }
        });
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'COMPLETO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'PARCIAL': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'PENDIENTE': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    }

    getAvancePorcentaje(row: MaestroEntregaDto): number {
        if (!row.cantidadTotal) return 0;
        return (row.entregadoTotal / row.cantidadTotal) * 100;
    }
}
