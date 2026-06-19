import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventosService, Asistente } from '../eventos.service';

@Component({
    selector: 'eventos-control',
    templateUrl: './control.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventosControlComponent implements OnInit, OnDestroy {
    private _eventosService = inject(EventosService);
    private _cdr = inject(ChangeDetectorRef);

    // State lists
    public asistentes: Asistente[] = [];
    public filteredAsistentes: Asistente[] = [];
    public searchQuery: string = '';
    public selectedEventoId: number = 2026;

    // Action loaders
    public bulkResending: boolean = false;
    public resendingId: number | null = null;

    // Toast Alert
    public toast: { show: boolean; message: string; type: 'success' | 'error' | 'warning' } = {
        show: false,
        message: '',
        type: 'success'
    };
    private toastTimeout: any;

    // Modal Control
    public isModalOpen: boolean = false;
    public isEditing: boolean = false;
    public editingId: number | null = null;

    // Form Model
    public formModel = {
        tipo: 'General' as 'General' | 'Estudiante',
        nombre: '',
        apellidos: '',
        correo: '',
        telefono: '',
        asistencias: {
            '16 de Octubre': false,
            '17 de Octubre': false
        } as { [key: string]: boolean },
        comoSeEntero: {
            'Facebook': false,
            'LinkedIn': false,
            'Página Web': false,
            'Recomendación': false
        } as { [key: string]: boolean },
        motivacion: {
            'Networking': false,
            'Aprendizaje': false,
            'Desarrollo Profesional': false,
            'Créditos Académicos': false
        } as { [key: string]: boolean },
        medioSeguimiento: 'Correo' as 'Correo' | 'WhatsApp' | 'Ninguno',
        
        // General specific
        direccion: '',
        ocupacion: '',
        empresa: '',

        // Student specific
        universidad: '',
        carrera: ''
    };

    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        this._eventosService.selectedEventoId$
            .pipe(takeUntil(this.destroy$))
            .subscribe(id => {
                this.selectedEventoId = id;
            });

        this._eventosService.asistentes$
            .pipe(takeUntil(this.destroy$))
            .subscribe(list => {
                this.asistentes = list;
                this.filterAsistentes();
                this._cdr.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
    }

    // --- Search Helper ---
    
    public filterAsistentes(): void {
        const query = this.searchQuery.toLowerCase().trim();
        const baseList = this.asistentes.filter(a => a.tipo === 'General' || a.tipo === 'Estudiante');
        if (!query) {
            this.filteredAsistentes = [...baseList];
        } else {
            this.filteredAsistentes = baseList.filter(a => 
                a.nombre.toLowerCase().includes(query) ||
                a.apellidos.toLowerCase().includes(query) ||
                a.correo.toLowerCase().includes(query) ||
                String(a.id).toLowerCase().includes(query) ||
                (a.empresa && a.empresa.toLowerCase().includes(query)) ||
                (a.universidad && a.universidad.toLowerCase().includes(query))
            );
        }
    }

    // --- Network Triggers with Loaders ---

    public onReenviarQRMasivo(): void {
        this.bulkResending = true;
        this._cdr.markForCheck();

        this._eventosService.reenviarQRMasivo(this.selectedEventoId)
            .subscribe({
                next: (res) => {
                    this.showToast('¡Reenvío Masivo Completado con Éxito!', 'success');
                    this.bulkResending = false;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.showToast('Error al enviar los correos masivos.', 'error');
                    this.bulkResending = false;
                    this._cdr.markForCheck();
                }
            });
    }

    public onReenviarQRIndividual(id: number): void {
        this.resendingId = id;
        this._cdr.markForCheck();

        this._eventosService.reenviarQRIndividual(id)
            .subscribe({
                next: (res) => {
                    this.showToast('Código QR reenviado exitosamente.', 'success');
                    this.resendingId = null;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.showToast('Error al reenviar el código QR.', 'error');
                    this.resendingId = null;
                    this._cdr.markForCheck();
                }
            });
    }

    // --- Toast Alert Helper ---

    private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toast = { show: true, message, type };
        this._cdr.markForCheck();
        
        this.toastTimeout = setTimeout(() => {
            this.toast.show = false;
            this._cdr.markForCheck();
        }, 3000);
    }

    // --- Modal / Form Logic ---

    public openRegisterModal(): void {
        this.resetForm();
        this.isEditing = false;
        this.isModalOpen = true;
    }

    public openEditModal(asistente: Asistente): void {
        this.resetForm();
        this.isEditing = true;
        this.editingId = asistente.id;

        // Populate fields
        this.formModel.tipo = asistente.tipo;
        this.formModel.nombre = asistente.nombre;
        this.formModel.apellidos = asistente.apellidos;
        this.formModel.correo = asistente.correo;
        this.formModel.telefono = asistente.telefono;
        this.formModel.medioSeguimiento = asistente.medioSeguimiento;
        
        // Checkboxes
        asistente.asistencias.forEach(a => {
            if (this.formModel.asistencias[a] !== undefined) {
                this.formModel.asistencias[a] = true;
            }
        });
        asistente.comoSeEntero.forEach(c => {
            if (this.formModel.comoSeEntero[c] !== undefined) {
                this.formModel.comoSeEntero[c] = true;
            }
        });
        asistente.motivacion.forEach(m => {
            if (this.formModel.motivacion[m] !== undefined) {
                this.formModel.motivacion[m] = true;
            }
        });

        // Conditionals
        if (asistente.tipo === 'General') {
            this.formModel.direccion = asistente.direccion || '';
            this.formModel.ocupacion = asistente.ocupacion || '';
            this.formModel.empresa = asistente.empresa || '';
        } else {
            this.formModel.universidad = asistente.universidad || '';
            this.formModel.carrera = asistente.carrera || '';
        }

        this.isModalOpen = true;
    }

    public closeModal(): void {
        this.isModalOpen = false;
    }

    public onPerfilChanged(perfil: 'General' | 'Estudiante'): void {
        this.formModel.tipo = perfil;
    }

    public onSave(): void {
        // Simple manual validation
        if (!this.formModel.nombre || !this.formModel.apellidos || !this.formModel.correo || !this.formModel.telefono) {
            this.showToast('Por favor, rellene todos los campos obligatorios.', 'warning');
            return;
        }

        // Gather checklist values
        const asistenciasSeleccionadas = Object.keys(this.formModel.asistencias).filter(k => this.formModel.asistencias[k]);
        const enteradoSeleccionados = Object.keys(this.formModel.comoSeEntero).filter(k => this.formModel.comoSeEntero[k]);
        const motivacionesSeleccionadas = Object.keys(this.formModel.motivacion).filter(k => this.formModel.motivacion[k]);

        if (asistenciasSeleccionadas.length === 0) {
            this.showToast('Debe seleccionar al menos un día de asistencia.', 'warning');
            return;
        }

        // Build flat JSON to post to api/asistentes/upsert
        const payload: any = {
            nombre: this.formModel.nombre,
            apellidos: this.formModel.apellidos,
            correo: this.formModel.correo,
            telefono: this.formModel.telefono,
            tipo: this.formModel.tipo,
            asistencias: asistenciasSeleccionadas,
            comoSeEntero: enteradoSeleccionados,
            motivacion: motivacionesSeleccionadas,
            medioSeguimiento: this.formModel.medioSeguimiento,
            eventoId: this.selectedEventoId
        };

        if (this.formModel.tipo === 'General') {
            payload.direccion = this.formModel.direccion;
            payload.ocupacion = this.formModel.ocupacion;
            payload.empresa = this.formModel.empresa;
        } else {
            payload.universidad = this.formModel.universidad;
            payload.carrera = this.formModel.carrera;
        }

        if (this.isEditing && this.editingId) {
            payload.id = this.editingId;
            // Get original to preserve QR and Check-In statuses
            const original = this.asistentes.find(a => a.id === this.editingId);
            if (original) {
                payload.estatusQR = original.estatusQR;
                payload.asistencia = original.asistencia;
                payload.fechaCheckIn = original.fechaCheckIn;
            }
        }

        this._eventosService.registrarAsistente(payload).subscribe({
            next: (res) => {
                this.showToast(this.isEditing ? 'Asistente actualizado con éxito.' : 'Asistente registrado con éxito.', 'success');
                this.closeModal();
                this._cdr.markForCheck();
            },
            error: () => {
                this.showToast('Ocurrió un error al guardar el registro.', 'error');
            }
        });
    }

    // --- Helper Forms Reset ---

    private resetForm(): void {
        this.formModel = {
            tipo: 'General',
            nombre: '',
            apellidos: '',
            correo: '',
            telefono: '',
            asistencias: {
                '16 de Octubre': false,
                '17 de Octubre': false
            },
            comoSeEntero: {
                'Facebook': false,
                'LinkedIn': false,
                'Página Web': false,
                'Recomendación': false
            },
            motivacion: {
                'Networking': false,
                'Aprendizaje': false,
                'Desarrollo Profesional': false,
                'Créditos Académicos': false
            },
            medioSeguimiento: 'Correo',
            direccion: '',
            ocupacion: '',
            empresa: '',
            universidad: '',
            carrera: ''
        };
        this.editingId = null;
    }
}
