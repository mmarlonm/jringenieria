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
import { PersonalStaff, PersonalStaffService } from './personal-staff.service';
import { PersonalStaffDialogComponent } from './dialogs/personal-staff-dialog.component';
import { QrPreviewDialogComponent } from './dialogs/qr-preview-dialog.component';
import { EventosService } from '../eventos.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-personal-staff',
    templateUrl: './personal-staff.component.html',
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
export class EventosPersonalComponent implements OnInit {
    personalList: PersonalStaff[] = [];
    filteredList: PersonalStaff[] = [];
    isLoading: boolean = true;
    eventosList: any[] = [];

    // Filters
    searchQuery: string = '';
    selectedTipo: string = 'Todos';
    tiposPersonal = ['Todos', 'Expositor', 'Staff', 'Organizador', 'Soporte', 'Otro'];
    selectedEventoId: number = 2026;

    constructor(
        private _personalStaffService: PersonalStaffService,
        private _eventosService: EventosService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this._eventosService.ediciones$.subscribe(list => {
            this.eventosList = list || [];
        });
        this._eventosService.selectedEventoId$.subscribe(id => {
            this.selectedEventoId = id;
        });
        this.loadData();
    }

    getEventName(id: number): string {
        const ev = this.eventosList.find(e => e.id === id);
        return ev ? ev.nombre : `Evento ${id}`;
    }

    loadData(): void {
        this.isLoading = true;
        this._personalStaffService.getAll().subscribe({
            next: (data) => {
                this.personalList = data || [];
                this.applyFilters();
                this.isLoading = false;
            },
            error: (err) => {
                this.isLoading = false;
                console.error(err);
                Swal.fire('Error', 'No se pudo cargar la lista de personal.', 'error');
            }
        });
    }

    applyFilters(): void {
        const query = this.searchQuery.trim().toLowerCase();
        this.filteredList = this.personalList.filter(p => {
            const matchesSearch = !query || 
                p.nombreCompleto.toLowerCase().includes(query) ||
                p.empresa.toLowerCase().includes(query) ||
                p.cargo.toLowerCase().includes(query) ||
                p.correoElectronico.toLowerCase().includes(query);

            const matchesTipo = this.selectedTipo === 'Todos' || p.tipoPersonal === this.selectedTipo;

            return matchesSearch && matchesTipo;
        });
    }

    openPersonalDialog(personal?: PersonalStaff): void {
        const dialogRef = this._dialog.open(PersonalStaffDialogComponent, {
            width: '100%',
            maxWidth: '650px',
            data: { personal }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                Swal.fire({
                    title: '¡Guardado!',
                    text: 'El personal ha sido registrado con éxito.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                this.loadData();
                
                // Si es un registro nuevo, mostrar el QR generado directamente
                if (!personal) {
                    setTimeout(() => {
                        this.openQrDialog(result);
                    }, 500);
                }
            }
        });
    }

    openQrDialog(personal: PersonalStaff): void {
        this._dialog.open(QrPreviewDialogComponent, {
            width: '100%',
            maxWidth: '400px',
            data: { personal }
        });
    }

    deletePersonal(personal: PersonalStaff): void {
        Swal.fire({
            title: '¿Eliminar registro?',
            text: `¿Estás seguro de eliminar a "${personal.nombreCompleto}"? Esta acción no se puede deshacer.`,
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
                this._personalStaffService.delete(personal.id).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El registro ha sido eliminado del sistema.',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.loadData();
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo eliminar el personal.', 'error');
                    }
                });
            }
        });
    }

    getPhotoUrl(personal: PersonalStaff): string {
        if (!personal.fotoPath) return 'assets/images/avatars/profile.jpg';
        return this._personalStaffService.getPhotoUrl(personal.id);
    }

    enviarQrIndividual(p: PersonalStaff): void {
        Swal.fire({
            title: '¿Enviar QR por correo?',
            text: `Se enviará el código QR de acceso y tarjeta digital a ${p.correoElectronico}. ¿Deseas continuar?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-3xl p-6 shadow-2xl border-0',
                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-indigo-200',
                cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Enviando...',
                    text: 'Generando y enviando código QR por correo electrónico.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this._personalStaffService.enviarQrIndividual(p.id, this.selectedEventoId).subscribe({
                    next: (res) => {
                        Swal.fire({
                            title: '¡Enviado!',
                            text: res?.mensaje || 'El código QR ha sido enviado con éxito.',
                            icon: 'success',
                            timer: 2500,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', err?.error?.mensaje || 'No se pudo enviar el correo.', 'error');
                    }
                });
            }
        });
    }

    enviarQrMasivo(): void {
        const eventName = this.getEventName(this.selectedEventoId);
        Swal.fire({
            title: '¿Enviar QR masivo a Staff?',
            text: `Se enviará el código QR por correo a TODO el personal y expositores asociados al evento "${eventName}". ¿Estás seguro?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar a todos',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-3xl p-6 shadow-2xl border-0',
                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-indigo-200',
                cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Enviando correos...',
                    text: 'Este proceso puede tardar unos momentos. Por favor, no cierres esta ventana.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this._personalStaffService.enviarQrMasivo(this.selectedEventoId).subscribe({
                    next: (res) => {
                        Swal.fire({
                            title: '¡Proceso completado!',
                            text: res?.mensaje || 'Se han enviado los correos masivos con éxito.',
                            icon: 'success',
                            confirmButtonText: 'Aceptar',
                            buttonsStyling: false,
                            customClass: {
                                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg shadow-indigo-200'
                            }
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', err?.error?.mensaje || 'Ocurrió un error al procesar el envío masivo.', 'error');
                    }
                });
            }
        });
    }
}
