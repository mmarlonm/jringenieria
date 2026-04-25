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
import { ProjectService } from 'app/modules/admin/dashboards/project/project.service';
import { SolicitudCompra } from '../models/solicitud-compra.types';
import { BehaviorSubject, combineLatest, map, Observable, take } from 'rxjs';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { MatSelectModule } from '@angular/material/select';
import Swal from 'sweetalert2';

@Component({
    selector: 'solicitud-compra-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatTableModule, MatInputModule, MatTooltipModule, MatSortModule, FormsModule, MatMenuModule, MatPaginatorModule, MatSelectModule]
})
export class SolicitudCompraListComponent implements OnInit {
    solicitudes$: Observable<SolicitudCompra[]>;
    filteredSolicitudes$: Observable<SolicitudCompra[]>;
    displayedColumns: string[] = ['folio', 'esAprobada', 'fecha', 'sucursal', 'area', 'prioridad', 'cuadranteId', 'estatus', 'acciones'];
    filterValue: string = '';
    selectedSucursal: string = 'Todas';
    sucursales: any[] = [];
    count: number = 0;

    constructor(
        private _solicitudCompraService: SolicitudCompraService,
        private _projectService: ProjectService,
        private _chatNotificationService: ChatNotificationService
    ) { }

    ngOnInit(): void {
        this.solicitudes$ = this._solicitudCompraService.solicitudes$;
        this.loadBranches();
        
        this.filteredSolicitudes$ = combineLatest([
            this.solicitudes$,
            new BehaviorSubject(this.filterValue).asObservable(), // This needs to be tracked properly
        ]).pipe(
            map(([solicitudes, filter]) => {
                return this._filterSolicitudes(solicitudes);
            })
        );

        // Better way: use a trigger for filtering
        this._setupFiltering();

        this._solicitudCompraService.getTodas().subscribe();
    }

    private _setupFiltering(): void {
        this.filteredSolicitudes$ = this.solicitudes$.pipe(
            map(solicitudes => this._filterSolicitudes(solicitudes))
        );
        
        this.solicitudes$.subscribe(s => {
            const filtered = this._filterSolicitudes(s);
            this.count = filtered.length;
        });
    }

    loadBranches(): void {
        this._projectService.getUnidadesDeNegocio().subscribe(branches => {
            this.sucursales = [{ id: 0, nombre: 'Todas' }, ...branches];
            
            // Auto-select user branch
            const userBranch = this._getUserBranch();
            if (userBranch !== 'Todas' && this.sucursales.some(s => s.nombre === userBranch)) {
                this.selectedSucursal = userBranch;
            } else {
                this.selectedSucursal = 'Todas';
            }
            this.applyFilter();
        });
    }

    private _getUserBranch(): string {
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = userInformation.usuario || {};
            
            // Try different possible paths for the branch name
            const branchName = user.unidadNegocio?.nombre || 
                               user.sucursal || 
                               userInformation.unidadNegocio?.nombre || 
                               'Todas';
                               
            return branchName;
        } catch (e) {
            return 'Todas';
        }
    }

    applyFilter(): void {
        this._setupFiltering();
    }

    private _filterSolicitudes(solicitudes: SolicitudCompra[]): SolicitudCompra[] {
        if (!solicitudes) return [];
        
        return solicitudes.filter(s => {
            const matchesSearch = !this.filterValue || 
                s.idSolicitud.toString().includes(this.filterValue.toLowerCase()) ||
                (s.sucursal || '').toLowerCase().includes(this.filterValue.toLowerCase()) ||
                (s.areaSolicitante || '').toLowerCase().includes(this.filterValue.toLowerCase());
            
            const matchesSucursal = this.selectedSucursal === 'Todas' || s.sucursal === this.selectedSucursal;
            
            return matchesSearch && matchesSucursal;
        });
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
