import { Component, OnInit, inject } from '@angular/core';
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
import { EventosService, EventoEdicion } from '../eventos.service';
import { EventoDialogComponent } from './dialogs/evento-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-gestion-eventos',
    templateUrl: './gestion-eventos.component.html',
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
export class GestionEventosComponent implements OnInit {
    private _eventosService = inject(EventosService);
    private _dialog = inject(MatDialog);

    public listadoEventos: any[] = [];
    public filteredList: any[] = [];
    public isLoading: boolean = true;
    public searchQuery: string = '';

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.fetchEventos();
    }

    fetchEventos(): void {
        this.isLoading = true;
        this._eventosService.getEventosCompletos().subscribe({
            next: (list) => {
                this.listadoEventos = list || [];
                this.applyFilters();
                this.isLoading = false;
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Error fetching full events catalog:', err);
                Swal.fire('Error', 'No se pudo cargar la lista de eventos.', 'error');
            }
        });
    }

    applyFilters(): void {
        const query = this.searchQuery.trim().toLowerCase();
        this.filteredList = this.listadoEventos.filter(e => {
            return !query ||
                e.nombreNovedad.toLowerCase().includes(query) ||
                (e.sede && e.sede.toLowerCase().includes(query)) ||
                String(e.anio).includes(query);
        });
    }

    openEventoDialog(evento?: any): void {
        const dialogRef = this._dialog.open(EventoDialogComponent, {
            width: '100%',
            maxWidth: '550px',
            data: { evento }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                Swal.fire({
                    title: '¡Guardado!',
                    text: 'El evento ha sido registrado con éxito.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                this.loadData();
                this._eventosService.loadEventos(); // Refresh global editions catalog
            }
        });
    }

    deleteEvento(evento: any): void {
        Swal.fire({
            title: '¿Eliminar evento?',
            text: `¿Estás seguro de eliminar "${evento.nombreNovedad}"? Esta acción no se puede deshacer y fallará si tiene asistentes vinculados.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-3xl p-6 shadow-2xl border-0',
                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-red-650 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-red-200',
                cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this._eventosService.deleteEvento(evento.id).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El evento ha sido eliminado.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadData();
                        this._eventosService.loadEventos(); // Refresh global editions catalog
                    },
                    error: (err) => {
                        console.error(err);
                        const msg = err.error?.mensaje || err.error || 'No se pudo eliminar el evento (puede tener asistentes o talleres vinculados).';
                        Swal.fire('Error', msg, 'error');
                    }
                });
            }
        });
    }
}
