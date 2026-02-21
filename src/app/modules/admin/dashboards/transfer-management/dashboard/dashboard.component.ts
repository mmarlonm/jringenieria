import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransferManagementService } from '../transfer-management.service';
import { UsersService } from "app/modules/admin/security/users/users.service";
import Swal from 'sweetalert2';

// Material Imports
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GestionarTraspasoModalComponent } from '../gestionar-traspaso-modal/gestionar-traspaso-modal.component';
import { TraspasoTimelineModalComponent } from '../traspaso-timeline-modal/traspaso-timeline-modal.component';


@Component({
    selector: 'app-transfer-management-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatTooltipModule,
        MatDialogModule
    ]

})
export class TransferManagementDashboardComponent implements OnInit {

    public transfers: any[] = [];
    public loading: boolean = false;

    // Gestión de Usuarios y Avatares
    public userList: any[] = [];
    public userMap = new Map<number, any>();
    public userColors: { [key: string]: string } = {};
    private palette = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#4f46e5', '#9333ea'];

    // Filtros
    public folioFilter: string = '';
    public selectedStatus: number | null = null;
    public selectedBranch: number | null = null;

    // Columnas ajustadas para incluir avatares (envia y recibe)
    public displayedColumns: string[] = [
        'folio',
        'envia',      // Usuario que solicita
        'recibe',     // Usuario destinatario
        'product',
        'logistics',
        'status',
        'actions'
    ];

    constructor(
        private _transferService: TransferManagementService,
        private _usersService: UsersService,
        private _cdr: ChangeDetectorRef,
        private _dialog: MatDialog
    ) { }


    ngOnInit(): void {
        this.loadUsers(); // Primero cargamos usuarios, luego el historial
    }

    /**
     * Carga el catálogo de usuarios para los avatares
     */
    loadUsers(): void {
        this._usersService.getUsers().subscribe(users => {
            this.userList = users.filter(u => u.activo !== false);
            this.userMap.clear();

            this.userList.forEach(u => {
                const id = Number(u.usuarioId || u.id);
                const name = u.nombreUsuario || u.nombre || 'Usuario';
                this.userMap.set(id, u);

                if (!this.userColors[name]) {
                    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                    const colorIdx = Math.abs(hash) % this.palette.length;
                    this.userColors[name] = this.palette[colorIdx];
                }
            });
            this.consultar(); // Una vez mapeados, consultamos los traspasos
            this._cdr.detectChanges();
        });
    }

    /**
 * Helper para el HTML: Obtiene datos del avatar por ID de usuario
 */
    public getUserDisplay(userId: number) {
        const user = this.userMap.get(userId);
        const name = user?.nombreUsuario || user?.nombre || 'S/A';

        // Asumiendo que el campo se llama 'avatar' en tu JSON de usuarios
        // Si el nombre es distinto (ej. 'foto'), cámbialo aquí:
        const base64Image = user?.avatar || user?.foto || null;

        return {
            name: name,
            initials: name.split(' ').map((n: any) => n[0]).join('').toUpperCase().substring(0, 2),
            color: this.userColors[name] || '#cbd5e1',
            avatar: base64Image // Retornamos la cadena Base64
        };
    }

    get pendingCount(): number {
        return this.transfers.filter(t => t.estadoId === 1).length;
    }

    consultar(): void {
        this.loading = true;
        this._transferService.getHistorial(this.selectedBranch, this.selectedStatus)
            .subscribe({
                next: (resp) => {
                    this.transfers = resp;
                    this.loading = false;
                    this._cdr.detectChanges();
                },
                error: () => {
                    this.loading = false;
                    Swal.fire('Error', 'No se pudo cargar el historial', 'error');
                }
            });
    }

    verDetalle(traspaso: any): void {
        this._dialog.open(TraspasoTimelineModalComponent, {
            width: '650px',
            data: { traspaso },
            panelClass: 'custom-dialog-container'
        });
    }

    gestionarTraspaso(traspaso: any): void {

        const dialogRef = this._dialog.open(GestionarTraspasoModalComponent, {
            width: '550px',
            data: { traspaso },
            disableClose: true,
            panelClass: 'custom-dialog-container'
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.consultar();
            }
        });
    }


    getStatusClass(estadoId: number): string {
        switch (estadoId) {
            case 1: return 'status-pending';   // Solicitado
            case 2: return 'status-completed'; // Completado
            case 3: return 'status-incidence'; // Con Incidencia
            case 4: return 'status-transit';   // En Tránsito
            case 5: return 'status-rejected';  // Cancelado
            default: return 'status-unknown';
        }
    }

}