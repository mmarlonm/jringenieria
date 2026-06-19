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
    public activeTab: 'metrics' | 'matrix' | 'config' | 'scanLink' = 'metrics';
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

    // Toast Alert
    public toast: { show: boolean; message: string; type: 'success' | 'error' | 'warning' } = {
        show: false,
        message: '',
        type: 'success'
    };
    private toastTimeout: any;

    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        this.initTallerForm();

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
                this._cdr.markForCheck();
            });
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
    public setTab(tab: 'metrics' | 'matrix' | 'config' | 'scanLink'): void {
        this.activeTab = tab;
        if (tab === 'config') {
            this.loadTalleresAdminList();
        }
        this._cdr.markForCheck();
    }

    // --- Tab A: Live Dashboard Helpers ---
    public getOccupancyPercent(taller: ActividadMetricsDto): number {
        if (!taller || taller.cupoMaximo === 0) return 0;
        return Math.min(100, Math.round((taller.registradosActuales / taller.cupoMaximo) * 100));
    }

    public getProgressBarColor(taller: ActividadMetricsDto): string {
        const percent = this.getOccupancyPercent(taller);
        if (percent < 70) return 'bg-emerald-500';
        if (percent < 100) return 'bg-amber-500';
        return 'bg-rose-500 animate-pulse';
    }

    // --- Tab B: Pre-assignment Matrix Helpers ---
    public filterAsistentes(): void {
        const query = (this.searchTerm || '').trim().toLowerCase();
        const baseList = this.asistentes.filter(a => a.tipo === 'General' || a.tipo === 'Estudiante');
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

    // --- Tab C: Workshop Administration Helpers ---
    private initTallerForm(): void {
        this.tallerForm = this._fb.group({
            titulo: ['', [Validators.required]],
            expositor: ['', [Validators.required]],
            tipo: ['Pago', [Validators.required]],
            cupoMaximo: [30, [Validators.required, Validators.min(1)]],
            ubicacionLugar: ['', [Validators.required]],
            fechaHoraInicio: ['', [Validators.required]],
            fechaHoraFin: ['', [Validators.required]]
        });
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
        this.tallerForm.patchValue({
            titulo: taller.titulo,
            expositor: taller.expositor,
            tipo: taller.tipo,
            cupoMaximo: taller.cupoMaximo,
            ubicacionLugar: taller.ubicacionLugar,
            fechaHoraInicio: this.formatDateTimeLocal(taller.fechaHoraInicio),
            fechaHoraFin: this.formatDateTimeLocal(taller.fechaHoraFin)
        });
        this._cdr.markForCheck();
    }

    public cancelEditTaller(): void {
        this.editingTaller = null;
        this.tallerForm.reset({
            tipo: 'Pago',
            cupoMaximo: 30
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
            fechaHoraInicio: new Date(formValue.fechaHoraInicio).toISOString(),
            fechaHoraFin: new Date(formValue.fechaHoraFin).toISOString()
        };

        if (this.editingTaller) {
            this._eventosService.editarTaller(this.editingTaller.id, payload).subscribe({
                next: (updatedTaller) => {
                    this.isCreatingTaller = false;
                    this.editingTaller = null;
                    this.tallerForm.reset({
                        tipo: 'Pago',
                        cupoMaximo: 30
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
                    this.tallerForm.reset({
                        tipo: 'Pago',
                        cupoMaximo: 30
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
}
