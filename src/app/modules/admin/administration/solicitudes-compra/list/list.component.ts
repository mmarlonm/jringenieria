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
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
    selector: 'solicitud-compra-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatTableModule, MatInputModule, MatTooltipModule, MatSortModule, FormsModule, MatMenuModule, MatPaginatorModule, MatSelectModule, MatDialogModule, ImagePreviewDialogComponent]
})
export class SolicitudCompraListComponent implements OnInit {
    solicitudes$: Observable<SolicitudCompra[]>;
    filteredSolicitudes$: Observable<SolicitudCompra[]>;
    displayedColumns: string[] = ['folio', 'esAprobada', 'fecha', 'sucursal', 'area', 'prioridad', 'proveedor', 'cuadranteId', 'estatus', 'acciones'];
    filterValue: string = '';
    selectedSucursal: string = 'Todas';
    sucursales: any[] = [];
    count: number = 0;

    constructor(
        private _solicitudCompraService: SolicitudCompraService,
        private _projectService: ProjectService,
        private _chatNotificationService: ChatNotificationService,
        private _dialog: MatDialog
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

    verArchivos(solicitud: SolicitudCompra): void {
        this._solicitudCompraService.getArchivos(solicitud.idSolicitud).subscribe(response => {
            if (response && response.success && response.archivos && response.archivos.length > 0) {
                const archivos = response.archivos;
                
                if (archivos.length === 1) {
                    this._descargarArchivo(solicitud.idSolicitud, archivos[0]);
                } else {
                    const inputOptions = {};
                    archivos.forEach(a => {
                        inputOptions[a] = a;
                    });

                    Swal.fire({
                        title: 'Cotizaciones Adjuntas',
                        text: 'Selecciona el archivo que deseas visualizar',
                        input: 'select',
                        inputOptions: inputOptions,
                        showCancelButton: true,
                        confirmButtonText: 'Ver Archivo',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#4F46E5',
                        customClass: {
                            confirmButton: 'rounded-xl',
                            cancelButton: 'rounded-xl'
                        }
                    }).then((result) => {
                        if (result.isConfirmed && result.value) {
                            this._descargarArchivo(solicitud.idSolicitud, result.value);
                        }
                    });
                }
            } else {
                this._chatNotificationService.showWarning('Sin adjuntos', 'Esta solicitud no tiene archivos o cotizaciones adjuntas.');
            }
        });
    }

    private _descargarArchivo(id: number, nombre: string): void {
        this._solicitudCompraService.descargarArchivo(id, nombre).subscribe(async (blob: Blob) => {
            const extension = nombre.split('.').pop()?.toLowerCase() || '';
            const isPdf = extension === 'pdf';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);

            if (isPdf || isImage) {
                let fileData: any;
                if (isPdf) {
                    const arrayBuffer = await blob.arrayBuffer();
                    fileData = new Uint8Array(arrayBuffer);
                    this._openPreviewDialog(fileData, nombre, true);
                } else {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        fileData = e.target.result;
                        this._openPreviewDialog(fileData, nombre, false);
                    };
                    reader.readAsDataURL(blob);
                }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = nombre;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 100);
            }
        });
    }

    private _openPreviewDialog(url: any, name: string, isPdf: boolean): void {
        this._dialog.open(ImagePreviewDialogComponent, {
            data: {
                url: url,
                name: name,
                isPdf: isPdf
            },
            panelClass: 'bg-transparent',
            maxWidth: isPdf ? '95vw' : '90vw',
            width: isPdf ? '1100px' : 'auto',
            backdropClass: ['bg-black', 'bg-opacity-80']
        });
    }

    getSelectedProvider(solicitud: SolicitudCompra): string {
        if (!solicitud.proveedores || solicitud.proveedores.length === 0) {
            return 'Sin asignar';
        }
        const seleccionado = solicitud.proveedores.find(p => p.esSeleccionado);
        return seleccionado ? seleccionado.razonSocial : 'Sin asignar';
    }
}
