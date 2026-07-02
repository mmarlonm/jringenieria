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
import { MatCheckboxModule } from '@angular/material/checkbox';
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
        MatTooltipModule,
        MatCheckboxModule
    ]
})
export class EventosPersonalComponent implements OnInit {
    personalList: (PersonalStaff & { selectedForEmail?: boolean })[] = [];
    filteredList: (PersonalStaff & { selectedForEmail?: boolean })[] = [];
    isLoading: boolean = true;
    eventosList: any[] = [];
    allSelected: boolean = false;

    // Filters
    searchQuery: string = '';
    selectedTipo: string = 'Todos';
    tiposPersonal = ['Todos', 'Expositor', 'Staff', 'Organizador', 'Soporte', 'Otro'];
    selectedEventoId: number = 0;

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
            if (id && this.selectedEventoId === 0) {
                this.selectedEventoId = id;
                this.applyFilters();
            }
        });
        this.loadData();
    }

    getEventName(id: number): string {
        const ev = this.eventosList.find(e => e.id === id);
        return ev ? ev.nombre || ev.nombreNovedad : `Evento ${id}`;
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

            const matchesEvento = !this.selectedEventoId || 
                (p.eventoIds && p.eventoIds.includes(Number(this.selectedEventoId)));

            return matchesSearch && matchesTipo && matchesEvento;
        });

        // Update selectedForEmail state dynamically based on selected event's email status
        this.filteredList.forEach(p => {
            p.selectedForEmail = !this.isEmailEnviadoForSelectedEvent(p);
        });

        this.updateAllSelectedState();
    }

    isEmailEnviadoForSelectedEvent(p: any): boolean {
        if (!this.selectedEventoId || this.selectedEventoId === 0) {
            return p.emailEnviado;
        }
        const status = p.eventosEmailStatus?.find((es: any) => es.eventoId === Number(this.selectedEventoId));
        return status ? status.emailEnviado : false;
    }

    isEmailEnviadoForEvent(p: any, eventId: number): boolean {
        const status = p.eventosEmailStatus?.find((es: any) => es.eventoId === Number(eventId));
        return status ? status.emailEnviado : false;
    }

    toggleSelectAll(checked: boolean): void {
        this.allSelected = checked;
        this.filteredList.forEach(p => {
            p.selectedForEmail = checked;
        });
    }

    updateAllSelectedState(): void {
        if (this.filteredList.length === 0) {
            this.allSelected = false;
            return;
        }
        this.allSelected = this.filteredList.every(p => p.selectedForEmail);
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

    enviarQrIndividual(p: any): void {
        const personEvents = p.eventoIds && p.eventoIds.length > 0 ? p.eventoIds : this.eventosList.map(e => e.id);
        if (personEvents.length === 0) {
            Swal.fire('Atención', 'No hay eventos disponibles para asociar a esta invitación.', 'warning');
            return;
        }

        const selectOptions: { [key: string]: string } = {};
        personEvents.forEach((id: number) => {
            selectOptions[String(id)] = this.getEventName(id);
        });

        const defaultEventValue = this.selectedEventoId && personEvents.includes(Number(this.selectedEventoId)) 
            ? String(this.selectedEventoId) 
            : String(personEvents[0]);

        Swal.fire({
            title: 'Seleccionar Evento',
            text: `Selecciona el evento para el cual enviarás la invitación con código QR a ${p.nombreCompleto}:`,
            input: 'select',
            inputOptions: selectOptions,
            inputValue: defaultEventValue,
            showCancelButton: true,
            confirmButtonText: 'Enviar invitación',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Debes seleccionar un evento.';
                }
                return null;
            },
            customClass: {
                popup: 'rounded-3xl p-6 shadow-2xl border-0',
                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-indigo-200',
                cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
            },
            buttonsStyling: false
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const targetEventoId = Number(result.value);

                Swal.fire({
                    title: 'Enviando...',
                    text: 'Generando y enviando código QR por correo electrónico.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this._personalStaffService.enviarQrIndividual(p.id, targetEventoId).subscribe({
                    next: (res) => {
                        p.emailEnviado = true;
                        p.selectedForEmail = false;
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
        const selectedStaff = this.filteredList.filter(p => p.selectedForEmail);
        if (selectedStaff.length === 0) {
            Swal.fire('Atención', 'Por favor selecciona al menos una persona para el envío masivo.', 'warning');
            return;
        }

        if (this.eventosList.length === 0) {
            Swal.fire('Atención', 'No hay eventos disponibles para realizar el envío.', 'warning');
            return;
        }

        const selectOptions: { [key: string]: string } = {};
        this.eventosList.forEach((ev: any) => {
            selectOptions[String(ev.id)] = ev.nombre || ev.nombreNovedad;
        });

        const defaultEventValue = this.selectedEventoId && this.selectedEventoId !== 0 
            ? String(this.selectedEventoId) 
            : String(this.eventosList[0].id);

        Swal.fire({
            title: 'Seleccionar Evento para Envío Masivo',
            text: `Selecciona el evento para el cual enviarás la invitación masiva a las ${selectedStaff.length} personas seleccionadas:`,
            input: 'select',
            inputOptions: selectOptions,
            inputValue: defaultEventValue,
            showCancelButton: true,
            confirmButtonText: 'Iniciar envío masivo',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Debes seleccionar un evento.';
                }
                return null;
            },
            customClass: {
                popup: 'rounded-3xl p-6 shadow-2xl border-0',
                confirmButton: 'inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all duration-300 mx-2 shadow-lg shadow-indigo-200',
                cancelButton: 'inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-xl transition-all duration-300 mx-2'
            },
            buttonsStyling: false
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const targetEventoId = Number(result.value);

                Swal.fire({
                    title: 'Enviando correos...',
                    text: 'Este proceso puede tardar unos momentos. Por favor, no cierres esta ventana.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const selectedIds = selectedStaff.map(p => p.id);

                this._personalStaffService.enviarQrMasivo(targetEventoId, selectedIds).subscribe({
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
                        this.loadData();
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', err?.error?.mensaje || 'Ocurrió un error al procesar el envío masivo.', 'error');
                    }
                });
            }
        });
    }

    async importarExcel(event: any): Promise<void> {
        const file = event.target.files[0];
        if (!file) return;

        event.target.value = '';

        Swal.fire({
            title: 'Procesando archivo...',
            text: 'Por favor espera mientras importamos el personal.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const arrayBuffer = await file.arrayBuffer();
            const excelJsModule = await import('exceljs');
            const ExcelJS = (excelJsModule as any).default ?? excelJsModule;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            
            const sheet = workbook.worksheets[0];
            if (!sheet) {
                throw new Error('No se encontró ninguna hoja en el archivo de Excel.');
            }

            const rowsToImport: any[] = [];
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip headers

                const nombre = row.getCell(2).value?.toString() || '';
                const apellido = row.getCell(3).value?.toString() || '';
                const empresa = row.getCell(4).value?.toString() || '';
                const telefono = row.getCell(5).value?.toString() || '';
                const correo = row.getCell(6).value?.toString() || '';

                if (nombre && correo) {
                    rowsToImport.push({
                        nombreCompleto: `${nombre} ${apellido}`.trim(),
                        empresa: empresa || 'JR',
                        cargo: 'Expositor',
                        correoElectronico: correo,
                        telefonoWhatsapp: telefono,
                        tipoPersonal: 'Expositor',
                        compartirDatos: true,
                        eventoIds: this.selectedEventoId && this.selectedEventoId !== 0 ? [Number(this.selectedEventoId)] : []
                    });
                }
            });

            if (rowsToImport.length === 0) {
                Swal.fire('Atención', 'No se encontraron registros válidos para importar. Asegúrate de tener al menos Nombre y Correo electrónico.', 'warning');
                return;
            }

            let importedCount = 0;
            for (const item of rowsToImport) {
                try {
                    await this._personalStaffService.save(item).toPromise();
                    importedCount++;
                } catch (saveErr) {
                    console.error('Error al guardar fila:', item, saveErr);
                }
            }

            Swal.fire({
                title: '¡Importación completada!',
                text: `Se importaron con éxito ${importedCount} de ${rowsToImport.length} registros.`,
                icon: 'success'
            });

            this.loadData();
        } catch (err: any) {
            console.error(err);
            Swal.fire('Error', `Ocurrió un error al importar el archivo: ${err.message || err}`, 'error');
        }
    }
}
