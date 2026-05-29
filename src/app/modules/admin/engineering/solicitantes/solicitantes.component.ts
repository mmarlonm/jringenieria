import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { EngineeringService, Solicitante } from '../engineering.service';
import { SolicitanteDialogComponent } from './solicitante-dialog/solicitante-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-solicitantes',
    templateUrl: './solicitantes.component.html',
    styleUrls: ['./solicitantes.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatDialogModule
    ]
})
export class SolicitantesComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ['idSolicitante', 'nombreCompleto', 'celular', 'empresa', 'area', 'acciones'];
    dataSource = new MatTableDataSource<Solicitante>();
    solicitantesCount: number = 0;
    searchText: string = '';

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    constructor(
        private _engineeringService: EngineeringService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.getSolicitantes();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    getSolicitantes(): void {
        this._engineeringService.getSolicitantes().subscribe({
            next: (solicitantes) => {
                this.solicitantesCount = solicitantes.length;
                this.dataSource.data = solicitantes;
            },
            error: (err) => {
                console.error('Error al obtener solicitantes', err);
            }
        });
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    addSolicitante(): void {
        const dialogRef = this._dialog.open(SolicitanteDialogComponent, {
            width: '100%',
            maxWidth: '500px',
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this._engineeringService.saveSolicitante(result).subscribe({
                    next: () => {
                        this.getSolicitantes();
                        Swal.fire({
                            title: '¡Éxito!',
                            text: 'Solicitante creado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo guardar el solicitante', 'error');
                    }
                });
            }
        });
    }

    editSolicitante(solicitante: Solicitante): void {
        const dialogRef = this._dialog.open(SolicitanteDialogComponent, {
            width: '100%',
            maxWidth: '500px',
            data: { solicitante },
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this._engineeringService.saveSolicitante(result).subscribe({
                    next: () => {
                        this.getSolicitantes();
                        Swal.fire({
                            title: '¡Éxito!',
                            text: 'Solicitante actualizado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo actualizar el solicitante', 'error');
                    }
                });
            }
        });
    }

    deleteSolicitante(id: number): void {
        Swal.fire({
            title: '¿Eliminar solicitante?',
            text: 'Esta acción desactivará al solicitante de la lista.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                confirmButton: 'inline-flex items-center justify-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-all mx-2',
                cancelButton: 'inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-lg transition-all mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this._engineeringService.deleteSolicitante(id).subscribe({
                    next: () => {
                        this.getSolicitantes();
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'Solicitante eliminado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo eliminar el solicitante', 'error');
                    }
                });
            }
        });
    }
}
