import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CierreTerminalService } from '../cierre-terminal.service';
import { CierreTerminal } from '../cierre-terminal.types';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { CierreTerminalFormDialogComponent } from '../form/cierre-terminal-form.component';
import { CierreTerminalDetailComponent } from '../detail/cierre-terminal-detail.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'cierre-terminal-list',
    templateUrl: './cierre-terminal-list.component.html',
    styleUrls: ['./cierre-terminal-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatSortModule,
        MatTableModule,
        MatTooltipModule,
        MatDialogModule,
        MatFormFieldModule
    ]
})
export class CierreTerminalListComponent implements OnInit, OnDestroy {
    displayedColumns: string[] = ['sucursal', 'fechaCierre', 'afiliacion', 'montoTotal', 'foliosFacturas', 'acciones'];
    dataSource: MatTableDataSource<CierreTerminal> = new MatTableDataSource();
    isLoading: boolean = false;

    @ViewChild(MatSort) sort: MatSort;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _cierreService: CierreTerminalService,
        private _dialog: MatDialog,
        private _notificationService: ChatNotificationService,
        private _router: Router
    ) { }

    ngOnInit(): void {
        this.loadData();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    loadData(): void {
        this.isLoading = true;
        this._cierreService.getAll()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => {
                    this.dataSource.data = res;
                    this.dataSource.sort = this.sort;
                    this.isLoading = false;
                },
                error: () => {
                    this.isLoading = false;
                    this._notificationService.showError('Error', 'No se pudieron cargar los cierres de terminal');
                }
            });
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    openFormDialog(id?: number): void {
        const dialogRef = this._dialog.open(CierreTerminalFormDialogComponent, {
            data: { id },
            width: '100%',
            maxWidth: '800px',
            autoFocus: false,
            disableClose: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadData();
            }
        });
    }

    deleteCierre(id: number): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción eliminará el registro de cierre y sus evidencias permanentemente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._cierreService.delete(id).subscribe({
                    next: () => {
                        this._notificationService.showSuccess('Eliminado', 'El cierre ha sido eliminado correctamente.');
                        this.loadData();
                    },
                    error: () => {
                        this._notificationService.showError('Error', 'No se pudo eliminar el registro.');
                    }
                });
            }
        });
    }

    verDetalle(id: number): void {
        this._dialog.open(CierreTerminalDetailComponent, {
            data: { id },
            width: '100%',
            maxWidth: '1200px',
            autoFocus: false
        });
    }

    formatFolios(folios: string): string {
        if (!folios) return '-';
        const parts = folios.split(',');
        if (parts.length <= 3) return folios;
        return `${parts.slice(0, 3).join(', ')} (+${parts.length - 3})`;
    }
}
