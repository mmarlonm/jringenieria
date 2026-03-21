import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';
import { PurchaseReceptionService } from './purchase-reception.service';
import { UsersService } from '../../security/users/users.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { PurchaseReceptionFormDialogComponent } from './purchase-reception-form-dialog.component';
import { PurchaseReceptionDetailsDialogComponent } from './purchase-reception-details-dialog.component';

@Component({
    selector: 'purchase-reception',
    templateUrl: './purchase-reception.component.html',
    styleUrls: ['./purchase-reception.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatSelectModule,
        MatSortModule,
        MatTableModule,
        MatTooltipModule,
        MatDialogModule,
        MatNativeDateModule,
        PurchaseReceptionDetailsDialogComponent
    ]
})
export class PurchaseReceptionComponent implements OnInit, OnDestroy {
    
    displayedColumns: string[] = [
        'idRecepcion',
        'idSolicitud',
        'folioOC',
        'fechaRecepcion',
        'sucursal',
        'proyecto',
        'quienRecibio',
        'lugarEntrega',
        'estatus',
        'acciones'
    ];
    
    dataSource: MatTableDataSource<any> = new MatTableDataSource();
    usuarios: any[] = [];
    isLoading: boolean = false;
    
    // KPIs
    totalRecepciones: number = 0;
    hoyRecepciones: number = 0;
    semanaRecepciones: number = 0;

    fechaInicio: any = '';
    fechaFin: any = '';
    filtroSearch: string = '';

    @ViewChild(MatSort) sort: MatSort;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _receptionService: PurchaseReceptionService,
        private _usersService: UsersService,
        private _dialog: MatDialog,
        private _notificationService: ChatNotificationService
    ) { }

    ngOnInit(): void {
        this.loadUsers();
        
        // Default dates
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        this.fechaInicio = firstDay.toISOString().split('T')[0];
        this.fechaFin = now.toISOString().split('T')[0];

        this.loadData();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    loadUsers(): void {
        this._usersService.getUsers()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(users => {
                this.usuarios = users || [];
            });
    }

    loadData(): void {
        this.isLoading = true;
        this._receptionService.getRecepciones(this.fechaInicio, this.fechaFin)
            .subscribe({
                next: (res: any) => {
                    this.dataSource.data = res.data || res || [];
                    this.dataSource.sort = this.sort;
                    this._calculateKPIs();
                    this.isLoading = false;
                },
                error: () => {
                    this.isLoading = false;
                    this._notificationService.showError('Error', 'No se pudieron cargar las recepciones');
                }
            });
    }

    private _calculateKPIs(): void {
        const data = this.dataSource.data;
        this.totalRecepciones = data.length;
        
        const todayStr = new Date().toISOString().split('T')[0];
        this.hoyRecepciones = data.filter(r => r.fechaRecepcion?.startsWith(todayStr)).length;
        
        // Simple semana logic (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        this.semanaRecepciones = data.filter(r => new Date(r.fechaRecepcion) >= sevenDaysAgo).length;
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    openNewReceptionDialog(): void {
        const dialogRef = this._dialog.open(PurchaseReceptionFormDialogComponent, {
            data: { usuarios: this.usuarios },
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            autoFocus: false
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadData();
            }
        });
    }

    getUserLabel(idUsuario: number): string {
        const user = this.usuarios.find(u => u.id === idUsuario || u.usuarioId === idUsuario);
        return user ? (user.nombreUsuario || user.nombre) : `ID: ${idUsuario}`;
    }

    openDetailsDialog(reception: any): void {
        this._dialog.open(PurchaseReceptionDetailsDialogComponent, {
            data: { 
                idRecepcion: reception.idRecepcion || reception.id,
                idSolicitud: reception.idSolicitud
            },
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            autoFocus: false
        });
    }

    verArchivos(reception: any): void {
        this.openDetailsDialog(reception);
    }

    cambiarEstatus(reception: any, nuevoEstatus: number): void {
        const idRecepcion = reception.idRecepcion || reception.id;
        const textoEstado = nuevoEstatus === 1 ? 'Completado' : 'Pendiente';

        this._receptionService.actualizarEstatusRecepcion(idRecepcion, nuevoEstatus)
            .subscribe({
                next: () => {
                    reception.estatus = nuevoEstatus;
                    this._notificationService.showSuccess('Éxito', `Estatus actualizado a: ${textoEstado}`);
                    this._calculateKPIs(); // Recalcular si es necesario
                },
                error: (error) => {
                    console.error('Error al actualizar estatus', error);
                    this._notificationService.showError('Error', 'No se pudo actualizar el estatus');
                }
            });
    }
}
