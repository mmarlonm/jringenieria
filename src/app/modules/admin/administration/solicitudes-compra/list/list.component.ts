import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { SolicitudCompraService } from '../solicitud-compra.service';
import { SolicitudCompra } from '../models/solicitud-compra.types';
import { Observable, take } from 'rxjs';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'solicitud-compra-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatTableModule, MatInputModule, MatTooltipModule, MatSortModule, FormsModule, MatMenuModule, MatPaginatorModule]
})
export class SolicitudCompraListComponent implements OnInit {
    solicitudes$: Observable<SolicitudCompra[]>;
    displayedColumns: string[] = ['folio', 'esAprobada', 'fecha', 'sucursal', 'area', 'prioridad', 'cuadranteId', 'estatus', 'acciones'];
    filterValue: string = '';
    count: number = 0;

    constructor(
        private _solicitudCompraService: SolicitudCompraService,
        private _chatNotificationService: ChatNotificationService
    ) { }

    ngOnInit(): void {
        this.solicitudes$ = this._solicitudCompraService.solicitudes$;
        this.solicitudes$.subscribe(s => this.count = s.length);
        this._solicitudCompraService.getTodas().subscribe();
    }

    applyFilter(): void {
        // Simple filter implementation for UI match
        // In a real scenario, this would filter the dataSource
    }

    deleteSolicitud(id: number): void {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._solicitudCompraService.eliminar(id).subscribe(() => {
                    this._chatNotificationService.showSuccess('Éxito', 'Solicitud eliminada correctamente');
                    this._solicitudCompraService.getTodas().subscribe();
                });
            }
        });
    }

    // Helper methods for Eisenhower Matrix styling
    getCuadranteName(id: number): string {
        switch (id) {
            case 1: return 'Impt. y Urgente';
            case 2: return 'Impt., No Urgente';
            case 3: return 'No Impt., Urgente';
            case 4: return 'No Impt., No Urg.';
            default: return 'No asignado';
        }
    }

    getCuadranteColor(id: number): string {
        switch (id) {
            case 1: return '#f43f5e'; // rose-500
            case 2: return '#fbbf24'; // amber-400
            case 3: return '#34d399'; // emerald-400
            case 4: return '#38bdf8'; // sky-400
            default: return '#9ca3af'; // gray-400
        }
    }
}
