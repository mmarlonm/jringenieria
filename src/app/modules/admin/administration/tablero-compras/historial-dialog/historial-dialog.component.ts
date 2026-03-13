import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { SolicitudCompraService } from '../../solicitudes-compra/solicitud-compra.service';
import { HistorialEstatusDto } from '../../solicitudes-compra/models/solicitud-compra.types';
import { UsersService } from '../../../security/users/users.service';

@Component({
    selector: 'historial-dialog',
    templateUrl: './historial-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatProgressSpinnerModule,
        DatePipe
    ]
})
export class HistorialDialogComponent implements OnInit, OnDestroy {
    historial: HistorialEstatusDto[] = [];
    isLoading: boolean = true;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    private _allUsers: any[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { idSolicitud: number },
        public dialogRef: MatDialogRef<HistorialDialogComponent>,
        private _solicitudCompraService: SolicitudCompraService,
        private _usersService: UsersService
    ) {}

    ngOnInit(): void {
        this._loadHistorial();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    private _loadHistorial(): void {
        forkJoin({
            history: this._solicitudCompraService.getHistorial(this.data.idSolicitud),
            users: this._usersService.getUsers()
        })
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe({
            next: (response) => {
                this.historial = response.history?.data || [];
                this._allUsers = response.users || [];
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading history or users:', error);
                // Mock data if endpoint is not fully ready to prevent UI blocking
                if (error.status === 404 && !this.historial.length) {
                   this.historial = [
                       {
                           idHistorial: 1,
                           idEstatus: 1,
                           nombreEstatus: 'Creada',
                           idUsuario: 1,
                           fechaCambio: new Date().toISOString(),
                           comentarios: 'Solicitud creada en el sistema.'
                       }
                   ];
                }
                this.isLoading = false;
            }
        });
    }

    getUserLabel(idUsuario: number): string {
        if (!this._allUsers || this._allUsers.length === 0) return `Usuario ID: ${idUsuario}`;
        const user = this._allUsers.find(u => Number(u.id) === Number(idUsuario) || Number(u.usuarioId) === Number(idUsuario));
        if (user) {
            const codigo = user.codigoEmpleado || user.username || user.correo || '';
            const nombre = user.nombreCompleto || user.nombre || '';
            if (codigo && nombre) {
                return `${codigo} - ${nombre}`;
            } else if (nombre) {
                return nombre;
            }
        }
        return `Usuario ID: ${idUsuario}`;
    }

    getColorClass(idEstatus: number): string {
        switch (idEstatus) {
            case 1: return 'text-pink-500 bg-pink-100';
            case 2: return 'text-yellow-500 bg-yellow-100';
            case 3: return 'text-orange-500 bg-orange-100';
            case 4: return 'text-purple-500 bg-purple-100';
            case 5: return 'text-indigo-500 bg-indigo-100';
            case 6: return 'text-blue-500 bg-blue-100';
            case 7: return 'text-green-500 bg-green-100';
            case 8: return 'text-emerald-700 bg-emerald-100';
            default: return 'text-gray-500 bg-gray-100';
        }
    }
    
    getIcon(idEstatus: number): string {
        switch (idEstatus) {
            case 1: return 'heroicons_solid:document-plus';
            case 2: return 'heroicons_solid:magnifying-glass';
            case 3: return 'heroicons_solid:currency-dollar';
            case 4: return 'heroicons_solid:check-badge';
            case 5: return 'heroicons_solid:shopping-cart';
            case 6: return 'heroicons_solid:truck';
            case 7: return 'heroicons_solid:inbox-arrow-down';
            case 8: return 'heroicons_solid:lock-closed';
            default: return 'heroicons_solid:clock';
        }
    }
}
