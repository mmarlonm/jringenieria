import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ActividadesService, ActividadStaff } from './actividades.service';
import { ActividadFormDialogComponent } from './dialogs/actividad-form-dialog.component';
import { EventosService } from '../eventos.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-actividades',
    templateUrl: './actividades.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule
    ]
})
export class ActividadesComponent implements OnInit {
    actividadesList: ActividadStaff[] = [];
    filteredList: ActividadStaff[] = [];
    isLoading: boolean = true;
    eventosList: any[] = [];
    selectedEventoId: number = 0;
    searchQuery: string = '';

    constructor(
        private _actividadesService: ActividadesService,
        private _eventosService: EventosService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this._eventosService.ediciones$.subscribe(list => {
            this.eventosList = list || [];
        });
        this._eventosService.selectedEventoId$.subscribe(id => {
            if (id && this.selectedEventoId === 0) {
                this.selectedEventoId = id;
                this.loadData();
            }
        });
        if (this.selectedEventoId === 0) {
            this.loadData();
        }
    }

    loadData(): void {
        this.isLoading = true;
        this._actividadesService.getAll(this.selectedEventoId).subscribe({
            next: (data) => {
                this.actividadesList = data || [];
                this.applyFilters();
                this.isLoading = false;
            },
            error: (err) => {
                this.isLoading = false;
                console.error(err);
                Swal.fire('Error', 'No se pudo cargar la lista de actividades.', 'error');
            }
        });
    }

    applyFilters(): void {
        const query = this.searchQuery.trim().toLowerCase();
        this.filteredList = this.actividadesList.filter(a => {
            return !query ||
                a.titulo.toLowerCase().includes(query) ||
                (a.descripcion && a.descripcion.toLowerCase().includes(query)) ||
                (a.personalStaffNombre && a.personalStaffNombre.toLowerCase().includes(query));
        });
    }

    openActividadDialog(actividad?: ActividadStaff): void {
        const dialogRef = this._dialog.open(ActividadFormDialogComponent, {
            width: '100%',
            maxWidth: '550px',
            data: { 
                actividad,
                selectedEventoId: this.selectedEventoId 
            }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                Swal.fire({
                    title: '¡Guardado!',
                    text: 'La actividad ha sido asignada con éxito.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                this.loadData();
            }
        });
    }

    deleteActividad(actividad: ActividadStaff): void {
        Swal.fire({
            title: '¿Eliminar actividad?',
            text: `¿Estás seguro de eliminar la actividad "${actividad.titulo}"? Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-3xl p-6 shadow-2xl border-0',
                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-red-200',
                cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this._actividadesService.delete(actividad.id).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'La actividad ha sido eliminada.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadData();
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo eliminar la actividad.', 'error');
                    }
                });
            }
        });
    }
}
