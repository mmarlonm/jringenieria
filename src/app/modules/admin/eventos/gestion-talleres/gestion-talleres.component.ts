import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { EventosService, Asistente, ActividadMetricsDto, Actividad } from '../eventos.service';

@Component({
    selector: 'gestion-talleres',
    templateUrl: './gestion-talleres.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatInputModule,
        MatCheckboxModule,
        MatFormFieldModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GestionTalleresComponent implements OnInit, OnDestroy {
    private _eventosService = inject(EventosService);
    private _cdr = inject(ChangeDetectorRef);
    private _router = inject(Router);
    private _fb = inject(FormBuilder);

    // State
    public activeTab: 'metrics' | 'matrix' | 'config' | 'scanLink' | 'slider' = 'metrics';
    public selectedEventoId: number = 2026;
    public signalrStatus: string = 'Disconnected';
    
    // Live Dashboard
    public talleresMetrics: ActividadMetricsDto[] = [];
    
    // Pre-assignment Matrix
    public asistentes: Asistente[] = [];
    public filteredAsistentes: Asistente[] = [];
    public searchTerm: string = '';
    public selectedAsistente: Asistente | null = null;
    public availablePaidTalleres: Actividad[] = [];
    public selectedTallerIds: { [tallerId: number]: boolean } = {};
    public isSavingPreassignment: boolean = false;
    
    // Workshop Administration
    public talleresList: Actividad[] = [];
    public tallerForm!: FormGroup;
    public isCreatingTaller: boolean = false;
    public editingTaller: Actividad | null = null;
    public fotoPreview: string | null = null;

    // Slider Touch & Detail Modal
    public currentSlideIndex: number = 0;
    public selectedTallerDetail: Actividad | ActividadMetricsDto | null = null;
    public correoInscripcion: string = '';
    public isInscribiendoCorreo: boolean = false;
    public inscripcionRes: { success?: boolean; notRegistered?: boolean; message?: string; name?: string } | null = null;
    public readonly registroUniversitariosUrl = 'https://foroenergiza.jringenieriaelectrica.com.mx/formulario-universitarios/';
    
    // Touch swipe control
    private touchStartX: number = 0;
    private touchEndX: number = 0;

    // Toast Alert
    public toast: { show: boolean; message: string; type: 'success' | 'error' | 'warning' } = {
        show: false,
        message: '',
        type: 'success'
    };
    private toastTimeout: any;

    public ediciones: any[] = [];

    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        this.initTallerForm();

        // Subscribe to Ediciones
        this._eventosService.ediciones$
            .pipe(takeUntil(this.destroy$))
            .subscribe(eds => {
                this.ediciones = eds || [];
                this._cdr.markForCheck();
            });

        // Subscribe to Selected Event ID
        this._eventosService.selectedEventoId$
            .pipe(takeUntil(this.destroy$))
            .subscribe(id => {
                this.selectedEventoId = id;
                this.loadTalleresAdminList();
                this._eventosService.loadTalleresMetrics(id);
                this.selectedAsistente = null;
                this._cdr.markForCheck();
            });

        // Subscribe to SignalR connection status
        this._eventosService.signalrStatus$
            .pipe(takeUntil(this.destroy$))
            .subscribe(status => {
                this.signalrStatus = status;
                this._cdr.markForCheck();
            });

        // Subscribe to Assistants stream (for pre-assignment search)
        this._eventosService.asistentes$
            .pipe(takeUntil(this.destroy$))
            .subscribe(list => {
                this.asistentes = list || [];
                this.filterAsistentes();
                this._cdr.markForCheck();
            });

        // Subscribe to Workshop Metrics stream
        this._eventosService.talleresMetrics$
            .pipe(takeUntil(this.destroy$))
            .subscribe(metrics => {
                this.talleresMetrics = metrics || [];
                if (this.currentSlideIndex >= this.talleresMetrics.length) {
                    this.currentSlideIndex = 0;
                }
                this._cdr.markForCheck();
            });
    }

    public onEventoChanged(eventoId: number): void {
        this._eventosService.setSeleccionEdicion(eventoId);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
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

    // --- Tab Switcher ---
    public setTab(tab: 'metrics' | 'matrix' | 'config' | 'scanLink' | 'slider'): void {
        this.activeTab = tab;
        if (tab === 'config' || tab === 'slider') {
            this.loadTalleresAdminList();
        }
        this._cdr.markForCheck();
    }

    // --- Tab A: Live Dashboard Helpers ---
    public getOccupancyPercent(taller: ActividadMetricsDto | Actividad): number {
        if (!taller || taller.cupoMaximo === 0) return 0;
        const registrados = (taller as ActividadMetricsDto).registradosActuales || (taller as Actividad).registradosActuales || 0;
        return Math.min(100, Math.round((registrados / taller.cupoMaximo) * 100));
    }

    public getProgressBarColor(taller: ActividadMetricsDto | Actividad): string {
        const percent = this.getOccupancyPercent(taller);
        if (percent < 70) return 'bg-emerald-500';
        if (percent < 100) return 'bg-amber-500';
        return 'bg-rose-500 animate-pulse';
    }

    // --- Tab B: Pre-assignment Matrix Helpers ---
    public filterAsistentes(): void {
        const query = (this.searchTerm || '').trim().toLowerCase();
        const baseList = this.asistentes.filter(a => a.tipo);
        if (!query) {
            this.filteredAsistentes = baseList;
        } else {
            this.filteredAsistentes = baseList.filter(a => 
                (a.nombre + ' ' + a.apellidos).toLowerCase().includes(query) ||
                (a.correo || '').toLowerCase().includes(query)
            );
        }
        this._cdr.markForCheck();
    }

    public selectAsistente(asistente: Asistente): void {
        this.selectedAsistente = asistente;
        this._cdr.markForCheck();
        
        // Load all available workshops for this event
        this._eventosService.getTalleresPorEvento(this.selectedEventoId).subscribe({
            next: (list) => {
                // Filter only paid workshops ("Pago")
                this.availablePaidTalleres = list.filter(t => t.tipo === 'Pago');
                this._cdr.markForCheck();
                
                // Get already assigned workshops for this assistant
                this._eventosService.getTalleresPreasignados(asistente.id).subscribe({
                    next: (assignedIds) => {
                        this.selectedTallerIds = {};
                        this.availablePaidTalleres.forEach(t => {
                            this.selectedTallerIds[t.id] = assignedIds.includes(t.id);
                        });
                        this._cdr.markForCheck();
                    },
                    error: (err) => {
                        console.error('Error loading preassigned workshops:', err);
                        this._cdr.markForCheck();
                    }
                });
            },
            error: (err) => {
                console.error('Error loading event workshops:', err);
                this._cdr.markForCheck();
            }
        });
    }

    public closeDrawer(): void {
        this.selectedAsistente = null;
        this._cdr.markForCheck();
    }

    public toggleTallerSelection(tallerId: number, checked: boolean): void {
        this.selectedTallerIds[tallerId] = checked;
        this._cdr.markForCheck();
    }

    public savePreassignments(): void {
        if (!this.selectedAsistente) return;
        
        this.isSavingPreassignment = true;
        this._cdr.markForCheck();

        const actividadIds = Object.keys(this.selectedTallerIds)
            .map(Number)
            .filter(id => this.selectedTallerIds[id]);

        const payload = {
            asistenteId: this.selectedAsistente.id,
            actividadIds: actividadIds
        };

        this._eventosService.preAsignarTalleres(payload).subscribe({
            next: (res) => {
                this.isSavingPreassignment = false;
                this.closeDrawer();
                this._eventosService.loadTalleresMetrics(this.selectedEventoId); // refresh metrics
                this._cdr.markForCheck();
                this.showToast('Pre-asignaciones guardadas exitosamente.', 'success');
            },
            error: (err) => {
                this.isSavingPreassignment = false;
                this._cdr.markForCheck();
                this.showToast('Ocurrió un error al guardar las pre-asignaciones.', 'error');
            }
        });
    }

    // --- Tab C: Workshop Administration & Photo Helpers ---
    private initTallerForm(): void {
        this.tallerForm = this._fb.group({
            titulo: ['', [Validators.required]],
            expositor: ['', [Validators.required]],
            tipo: ['Pago', [Validators.required]],
            cupoMaximo: [30, [Validators.required, Validators.min(1)]],
            ubicacionLugar: ['', [Validators.required]],
            fotoPublicidadUrl: [''],
            fechaHoraInicio: ['', [Validators.required]],
            fechaHoraFin: ['', [Validators.required]]
        });
    }

    private compressImage(file: File, maxWidth: number = 1200, maxHeight: number = 500, quality: number = 0.82): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                        resolve(compressedBase64);
                    } else {
                        resolve(event.target.result);
                    }
                };
                img.onerror = (err) => reject(err);
                img.src = event.target.result;
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    public async onFotoSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];

            if (file.size > 10 * 1024 * 1024) {
                this.showToast('La imagen excede el límite máximo de 10MB.', 'warning');
                return;
            }

            try {
                const compressedBase64 = await this.compressImage(file, 1200, 500, 0.82);
                this.fotoPreview = compressedBase64;
                this.tallerForm.patchValue({ fotoPublicidadUrl: compressedBase64 });
                this.showToast('Imagen optimizada y cargada correctamente.', 'success');
                this._cdr.markForCheck();
            } catch (err) {
                console.error('Error al optimizar imagen:', err);
                this.showToast('No se pudo procesar la imagen.', 'error');
            }
        }
    }

    public removeFoto(): void {
        this.fotoPreview = null;
        this.tallerForm.patchValue({ fotoPublicidadUrl: '' });
        this._cdr.markForCheck();
    }

    public loadTalleresAdminList(): void {
        this._eventosService.getTalleresPorEvento(this.selectedEventoId).subscribe({
            next: (list) => {
                this.talleresList = list || [];
                this._cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading workshops for admin list:', err);
            }
        });
    }

    private formatDateTimeLocal(dateStr: string): string {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
    }

    public startEditTaller(taller: Actividad): void {
        this.editingTaller = taller;
        this.fotoPreview = taller.fotoPublicidadUrl || null;
        this.tallerForm.patchValue({
            titulo: taller.titulo,
            expositor: taller.expositor,
            tipo: taller.tipo,
            cupoMaximo: taller.cupoMaximo,
            ubicacionLugar: taller.ubicacionLugar,
            fotoPublicidadUrl: taller.fotoPublicidadUrl || '',
            fechaHoraInicio: this.formatDateTimeLocal(taller.fechaHoraInicio),
            fechaHoraFin: this.formatDateTimeLocal(taller.fechaHoraFin)
        });
        this._cdr.markForCheck();
    }

    public cancelEditTaller(): void {
        this.editingTaller = null;
        this.fotoPreview = null;
        this.tallerForm.reset({
            tipo: 'Pago',
            cupoMaximo: 30,
            fotoPublicidadUrl: ''
        });
        this._cdr.markForCheck();
    }

    public onSubmitTaller(): void {
        if (this.tallerForm.invalid) return;

        this.isCreatingTaller = true;
        this._cdr.markForCheck();

        const formValue = this.tallerForm.value;
        const payload = {
            eventoId: Number(this.selectedEventoId),
            titulo: formValue.titulo,
            expositor: formValue.expositor,
            tipo: formValue.tipo,
            cupoMaximo: Number(formValue.cupoMaximo),
            ubicacionLugar: formValue.ubicacionLugar,
            fotoPublicidadUrl: formValue.fotoPublicidadUrl || null,
            fechaHoraInicio: new Date(formValue.fechaHoraInicio).toISOString(),
            fechaHoraFin: new Date(formValue.fechaHoraFin).toISOString()
        };

        if (this.editingTaller) {
            this._eventosService.editarTaller(this.editingTaller.id, payload).subscribe({
                next: (updatedTaller) => {
                    this.isCreatingTaller = false;
                    this.editingTaller = null;
                    this.fotoPreview = null;
                    this.tallerForm.reset({
                        tipo: 'Pago',
                        cupoMaximo: 30,
                        fotoPublicidadUrl: ''
                    });
                    this.loadTalleresAdminList();
                    this._eventosService.loadTalleresMetrics(this.selectedEventoId); // refresh metrics
                    this._cdr.markForCheck();
                    this.showToast('Taller/Conferencia actualizado exitosamente.', 'success');
                },
                error: (err) => {
                    this.isCreatingTaller = false;
                    this._cdr.markForCheck();
                    this.showToast('Ocurrió un error al actualizar la actividad.', 'error');
                }
            });
        } else {
            this._eventosService.crearTaller(payload).subscribe({
                next: (newTaller) => {
                    this.isCreatingTaller = false;
                    this.fotoPreview = null;
                    this.tallerForm.reset({
                        tipo: 'Pago',
                        cupoMaximo: 30,
                        fotoPublicidadUrl: ''
                    });
                    this.loadTalleresAdminList();
                    this._eventosService.loadTalleresMetrics(this.selectedEventoId); // refresh metrics
                    this._cdr.markForCheck();
                    this.showToast('Taller/Conferencia creado exitosamente.', 'success');
                },
                error: (err) => {
                    this.isCreatingTaller = false;
                    this._cdr.markForCheck();
                    this.showToast('Ocurrió un error al crear la actividad.', 'error');
                }
            });
        }
    }

    public eliminarTaller(taller: Actividad): void {
        Swal.fire({
            title: '¿Eliminar este Taller?',
            text: `Se eliminará "${taller.titulo}" y las asignaciones asociadas a este taller de forma permanente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, Eliminar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-2xl dark:bg-slate-900 dark:text-white',
                confirmButton: 'rounded-xl px-5 py-2.5 font-bold',
                cancelButton: 'rounded-xl px-5 py-2.5 font-bold'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this._eventosService.eliminarTaller(taller.id).subscribe({
                    next: () => {
                        this.loadTalleresAdminList();
                        this._eventosService.loadTalleresMetrics(this.selectedEventoId);
                        this.showToast('El taller fue eliminado exitosamente.', 'success');
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El taller ha sido borrado del sistema.',
                            icon: 'success',
                            confirmButtonColor: '#4f46e5',
                            customClass: { popup: 'rounded-2xl dark:bg-slate-900 dark:text-white' }
                        });
                    },
                    error: (err) => {
                        console.error('Error al eliminar taller:', err);
                        this.showToast('No se pudo eliminar el taller.', 'error');
                    }
                });
            }
        });
    }

    // --- Slider & Touch Carousel Control ---
    public get currentSliderItems(): Actividad[] {
        return this.talleresList.length > 0 ? this.talleresList : [];
    }

    public nextSlide(): void {
        const total = this.currentSliderItems.length;
        if (total === 0) return;
        this.currentSlideIndex = (this.currentSlideIndex + 1) % total;
        this._cdr.markForCheck();
    }

    public prevSlide(): void {
        const total = this.currentSliderItems.length;
        if (total === 0) return;
        this.currentSlideIndex = (this.currentSlideIndex - 1 + total) % total;
        this._cdr.markForCheck();
    }

    public goToSlide(index: number): void {
        this.currentSlideIndex = index;
        this._cdr.markForCheck();
    }

    public onTouchStart(e: TouchEvent): void {
        this.touchStartX = e.changedTouches[0].screenX;
    }

    public onTouchEnd(e: TouchEvent): void {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
    }

    private handleSwipe(): void {
        const swipeThreshold = 40;
        if (this.touchEndX < this.touchStartX - swipeThreshold) {
            this.nextSlide();
        } else if (this.touchEndX > this.touchStartX + swipeThreshold) {
            this.prevSlide();
        }
    }

    // --- Workshop Detail Modal & Self Registration by Email ---
    public openDetailModal(taller: Actividad | ActividadMetricsDto): void {
        this.selectedTallerDetail = taller;
        this.correoInscripcion = '';
        this.inscripcionRes = null;
        this._cdr.markForCheck();
    }

    public closeDetailModal(): void {
        this.selectedTallerDetail = null;
        this.correoInscripcion = '';
        this.inscripcionRes = null;
        this._cdr.markForCheck();
    }

    public submitInscripcionCorreo(): void {
        if (!this.selectedTallerDetail || !this.correoInscripcion.trim()) return;

        this.isInscribiendoCorreo = true;
        this.inscripcionRes = null;
        this._cdr.markForCheck();

        const tallerId = (this.selectedTallerDetail as Actividad).id || (this.selectedTallerDetail as ActividadMetricsDto).actividadId;

        this._eventosService.inscribirTallerPorCorreo(this.correoInscripcion.trim(), tallerId, this.selectedEventoId).subscribe({
            next: (res) => {
                this.isInscribiendoCorreo = false;
                this.inscripcionRes = {
                    success: res.exito,
                    notRegistered: res.noRegistrado,
                    message: res.mensaje,
                    name: res.nombreAsistente
                };
                if (res.exito) {
                    this._eventosService.loadTalleresMetrics(this.selectedEventoId);
                    this.loadTalleresAdminList();
                }
                this._cdr.markForCheck();
            },
            error: (err) => {
                this.isInscribiendoCorreo = false;
                const errorMsg = err?.error?.mensaje || 'Error al procesar la inscripción por correo.';
                const notReg = err?.error?.noRegistrado || false;
                this.inscripcionRes = {
                    success: false,
                    notRegistered: notReg,
                    message: errorMsg
                };
                this._cdr.markForCheck();
            }
        });
    }
}
