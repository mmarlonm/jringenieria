import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MinutasService } from './minutas.service';
import { Minuta, MinutaCatalogos, MinutaUsuario, MinutaSucursal } from './minutas.types';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-minuta-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatProgressSpinnerModule,
        MatTooltipModule
    ],
    template: `
        <div class="flex flex-col max-h-[92vh] max-w-[750px] w-full bg-slate-900 text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60">
            <!-- Header con degradado glassmorphism -->
            <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border-b border-white/10 backdrop-blur-md">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <mat-icon class="icon-size-5" [svgIcon]="isEdit ? 'heroicons_outline:pencil-square' : 'heroicons_outline:cloud-arrow-up'"></mat-icon>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold tracking-tight text-white m-0">
                            {{ isEdit ? 'Editar Minuta de Reunión' : 'Subir Minuta a la Nube' }}
                        </h2>
                        <p class="text-xs text-slate-400 m-0">
                            Gestión y repositorio centralizado ISO 9001
                        </p>
                    </div>
                </div>
                <button mat-icon-button (click)="cancelar()" class="text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                    <mat-icon class="icon-size-5">close</mat-icon>
                </button>
            </div>

            <!-- Contenido scrollable -->
            <form [formGroup]="form" class="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                
                <!-- Título -->
                <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Título de la Minuta o Reunión <span class="text-red-400">*</span>
                    </label>
                    <input type="text" formControlName="titulo"
                           placeholder="Ej. Minuta de Revisión por la Dirección - Q4"
                           class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all">
                    <p *ngIf="form.get('titulo')?.invalid && form.get('titulo')?.touched" class="text-xs text-red-400 mt-1">
                        El título es obligatorio.
                    </p>
                </div>

                <!-- Fila: Sucursal y Fecha de Reunión -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Sucursal -->
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                            Sucursal <span class="text-red-400">*</span>
                        </label>
                        <select formControlName="sucursalId"
                                class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all">
                            <option [ngValue]="null">🌐 Todas las sucursales (General)</option>
                            <option *ngFor="let s of catalogos.sucursales" [ngValue]="s.sucursalId">
                                🏢 {{ s.nombre }}
                            </option>
                        </select>
                    </div>

                    <!-- Fecha de Reunión -->
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                            Fecha de la Reunión <span class="text-red-400">*</span>
                        </label>
                        <input type="date" formControlName="fechaReunion"
                               class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all">
                    </div>
                </div>

                <!-- Palabras Clave / Tags -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Palabras Clave (Búsqueda Rápida)
                        </label>
                        <span class="text-[11px] text-slate-400">Separar por comas</span>
                    </div>
                    <div class="relative">
                        <input type="text" formControlName="palabrasClave"
                               placeholder="Ej. calidad, auditoría, compras, no conformidad, mantenimiento"
                               class="w-full pl-9 pr-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all">
                        <mat-icon class="icon-size-4 absolute left-3 top-3 text-slate-400" svgIcon="heroicons_outline:tag"></mat-icon>
                    </div>
                    <div *ngIf="palabrasClavePreview.length > 0" class="flex flex-wrap gap-1.5 mt-2">
                        <span *ngFor="let tag of palabrasClavePreview"
                              class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            #{{ tag }}
                        </span>
                    </div>
                </div>

                <!-- Descripción / Resumen -->
                <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Resumen o Temas Tratados
                    </label>
                    <textarea formControlName="descripcion" rows="3"
                              placeholder="Breve resumen de acuerdos, compromisos o temas clave abordados en la minuta..."
                              class="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"></textarea>
                </div>

                <!-- Sección: Control de Visibilidad y Permisos -->
                <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-sm font-semibold text-white m-0 flex items-center gap-2">
                                <mat-icon class="icon-size-4 text-amber-400" [svgIcon]="form.get('esPublica')?.value ? 'heroicons_outline:globe-alt' : 'heroicons_outline:lock-closed'"></mat-icon>
                                Visibilidad y Privacidad
                            </h4>
                            <p class="text-xs text-slate-400 m-0">
                                {{ form.get('esPublica')?.value ? 'Cualquier usuario con acceso a Minutas puede consultarla' : 'Solo los usuarios autorizados explícitamente pueden verla' }}
                            </p>
                        </div>
                        <mat-slide-toggle formControlName="esPublica" color="primary">
                            <span class="text-xs font-semibold text-slate-300">
                                {{ form.get('esPublica')?.value ? 'Pública' : 'Restringida' }}
                            </span>
                        </mat-slide-toggle>
                    </div>

                    <!-- Selector de usuarios permitidos si es privada -->
                    <div *ngIf="!form.get('esPublica')?.value" class="pt-3 border-t border-slate-700/60 animate-fade-in">
                        <label class="block text-xs font-semibold uppercase tracking-wider text-amber-300 mb-1.5">
                            Seleccionar Usuarios con Acceso a esta Minuta <span class="text-red-400">*</span>
                        </label>
                        <mat-form-field appearance="outline" class="w-full fuse-mat-dense">
                            <mat-select formControlName="usuariosIds" multiple placeholder="Selecciona los usuarios autorizados">
                                <mat-select-trigger>
                                    {{ obtenerTextoUsuariosSeleccionados() }}
                                </mat-select-trigger>
                                <mat-option *ngFor="let u of catalogos.usuarios" [value]="u.usuarioId">
                                    <div class="flex flex-col">
                                        <span class="font-medium text-slate-200">{{ u.nombre }}</span>
                                        <span class="text-xs text-slate-400" *ngIf="u.email">{{ u.email }}</span>
                                    </div>
                                </mat-option>
                            </mat-select>
                        </mat-form-field>
                        <p class="text-[11px] text-slate-400 mt-0.5">
                            Nota: Los administradores y tú (como autor) siempre tendrán acceso a consultarla.
                        </p>
                    </div>
                </div>

                <!-- Dropzone de archivo -->
                <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Archivo de la Minuta {{ isEdit ? '(Opcional para reemplazar)' : '*' }}
                    </label>

                    <!-- Zona Drag & Drop -->
                    <div (dragover)="onDragOver($event)"
                         (dragleave)="onDragLeave($event)"
                         (drop)="onFileDrop($event)"
                         (click)="fileInput.click()"
                         [ngClass]="{
                            'border-blue-500 bg-blue-500/10': isDragging,
                            'border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-600': !isDragging
                         }"
                         class="cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 flex flex-col items-center justify-center group">
                        
                        <input #fileInput type="file" (change)="onFileSelected($event)" class="hidden"
                               accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt,.zip">

                        <!-- Icono -->
                        <div class="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 group-hover:scale-110 transition-transform flex items-center justify-center text-blue-400 mb-3 shadow-md">
                            <mat-icon class="icon-size-6" svgIcon="heroicons_outline:arrow-up-tray"></mat-icon>
                        </div>

                        <div *ngIf="!archivoSeleccionado && !archivoActualNombre">
                            <p class="text-sm font-semibold text-slate-200 m-0">
                                Arrastra y suelta aquí tu minuta, o <span class="text-blue-400 underline">haz clic para examinar</span>
                            </p>
                            <p class="text-xs text-slate-400 mt-1 m-0">
                                Formatos admitidos: PDF, Word (DOCX), Excel (XLSX), PowerPoint, Imágenes o ZIP (Hasta 50 MB)
                            </p>
                        </div>

                        <div *ngIf="archivoSeleccionado" class="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 px-4 py-2.5 rounded-xl">
                            <mat-icon class="icon-size-5 text-blue-400" svgIcon="heroicons_outline:document-text"></mat-icon>
                            <div class="text-left">
                                <p class="text-xs font-bold text-white m-0">{{ archivoSeleccionado.name }}</p>
                                <p class="text-[11px] text-blue-300 m-0">{{ formatearTamano(archivoSeleccionado.size) }}</p>
                            </div>
                            <button type="button" mat-icon-button (click)="$event.stopPropagation(); removerArchivo()" class="text-slate-400 hover:text-red-400">
                                <mat-icon class="icon-size-4">close</mat-icon>
                            </button>
                        </div>

                        <div *ngIf="!archivoSeleccionado && archivoActualNombre" class="flex items-center gap-3 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl">
                            <mat-icon class="icon-size-5 text-emerald-400" svgIcon="heroicons_outline:check-circle"></mat-icon>
                            <div class="text-left">
                                <p class="text-xs font-bold text-slate-200 m-0">Archivo actual: {{ archivoActualNombre }}</p>
                                <p class="text-[11px] text-slate-400 m-0">Haz clic o arrastra para reemplazarlo por uno nuevo</p>
                            </div>
                        </div>
                    </div>
                </div>

            </form>

            <!-- Footer con acciones -->
            <div class="flex items-center justify-between px-6 py-4 bg-slate-900 border-t border-slate-800">
                <button type="button" mat-button (click)="cancelar()" [disabled]="guardando"
                        class="text-slate-400 hover:text-white">
                    Cancelar
                </button>
                <button type="button" mat-flat-button (click)="guardar()" [disabled]="guardando || form.invalid"
                        class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2">
                    <mat-progress-spinner *ngIf="guardando" [diameter]="18" mode="indeterminate" class="mr-2"></mat-progress-spinner>
                    <mat-icon *ngIf="!guardando" class="icon-size-5" [svgIcon]="isEdit ? 'heroicons_outline:check' : 'heroicons_outline:cloud-arrow-up'"></mat-icon>
                    <span>{{ isEdit ? 'Guardar Cambios' : 'Subir Minuta' }}</span>
                </button>
            </div>
        </div>
    `,
    styles: [`
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.15);
            border-radius: 9999px;
        }
        ::ng-deep .mat-mdc-select-panel {
            background: #1e293b !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        ::ng-deep .mat-mdc-option {
            color: #cbd5e1 !important;
        }
        ::ng-deep .mat-mdc-option.mdc-list-item--selected:not(.mdc-list-item--disabled) .mdc-list-item__primary-text {
            color: #60a5fa !important;
        }
        ::ng-deep .mat-pseudo-checkbox-checked.mat-pseudo-checkbox-minimal::after {
            color: #60a5fa !important;
        }
    `]
})
export class MinutaDialogComponent implements OnInit {
    private _fb = inject(FormBuilder);
    private _minutasService = inject(MinutasService);
    public dialogRef = inject(MatDialogRef<MinutaDialogComponent>);

    form!: FormGroup;
    isEdit = false;
    guardando = false;
    isDragging = false;
    archivoSeleccionado: File | null = null;
    archivoActualNombre: string | null = null;

    catalogos: MinutaCatalogos = { sucursales: [], usuarios: [] };

    constructor(@Inject(MAT_DIALOG_DATA) public data: { minuta?: Minuta; catalogos: MinutaCatalogos }) {
        this.catalogos = data.catalogos || { sucursales: [], usuarios: [] };
        this.isEdit = !!data.minuta;
        this.archivoActualNombre = data.minuta?.archivoNombreOriginal || null;
    }

    ngOnInit(): void {
        const m = this.data.minuta;
        const fechaFormateada = m?.fechaReunion ? m.fechaReunion.substring(0, 10) : new Date().toISOString().substring(0, 10);

        this.form = this._fb.group({
            titulo: [m?.titulo || '', [Validators.required, Validators.maxLength(200)]],
            sucursalId: [m?.sucursalId || null],
            fechaReunion: [fechaFormateada, [Validators.required]],
            palabrasClave: [m?.palabrasClave || ''],
            descripcion: [m?.descripcion || ''],
            esPublica: [m ? m.esPublica : true],
            usuariosIds: [m?.usuariosPermitidosIds || []]
        });
    }

    get palabrasClavePreview(): string[] {
        const val = this.form.get('palabrasClave')?.value;
        if (!val || typeof val !== 'string') return [];
        return val.split(new RegExp('[,;]'))
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    obtenerTextoUsuariosSeleccionados(): string {
        const ids: number[] = this.form.get('usuariosIds')?.value || [];
        if (ids.length === 0) return 'Ningún usuario seleccionado';
        if (ids.length === 1) {
            const u = this.catalogos.usuarios.find(x => x.usuarioId === ids[0]);
            return u ? u.nombre : '1 usuario';
        }
        return `${ids.length} usuarios autorizados`;
    }

    onDragOver(e: DragEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(e: DragEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = false;
    }

    onFileDrop(e: DragEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = false;
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            this.procesarArchivo(e.dataTransfer.files[0]);
        }
    }

    onFileSelected(e: any): void {
        if (e.target && e.target.files && e.target.files.length > 0) {
            this.procesarArchivo(e.target.files[0]);
        }
    }

    procesarArchivo(file: File): void {
        // Validar tamaño máximo: 50MB
        const maxBytes = 50 * 1024 * 1024;
        if (file.size > maxBytes) {
            Swal.fire('Archivo demasiado grande', 'El archivo no debe exceder 50 MB.', 'warning');
            return;
        }
        this.archivoSeleccionado = file;
    }

    removerArchivo(): void {
        this.archivoSeleccionado = null;
    }

    formatearTamano(bytes?: number): string {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = 1;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    cancelar(): void {
        this.dialogRef.close(false);
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (!this.isEdit && !this.archivoSeleccionado) {
            Swal.fire('Archivo requerido', 'Por favor selecciona el archivo de la minuta a subir.', 'warning');
            return;
        }

        const esPublica = this.form.get('esPublica')?.value;
        const usuariosIds = this.form.get('usuariosIds')?.value;
        if (!esPublica && (!usuariosIds || usuariosIds.length === 0)) {
            Swal.fire('Usuarios requeridos', 'Al marcar la minuta como restringida, debes seleccionar al menos un usuario autorizado.', 'warning');
            return;
        }

        this.guardando = true;
        const val = this.form.value;

        const formData = new FormData();
        formData.append('titulo', val.titulo.trim());
        if (val.descripcion) formData.append('descripcion', val.descripcion.trim());
        formData.append('fechaReunion', val.fechaReunion);
        if (val.sucursalId) formData.append('sucursalId', val.sucursalId.toString());
        if (val.palabrasClave) formData.append('palabrasClave', val.palabrasClave.trim());
        formData.append('esPublica', esPublica.toString());

        if (!esPublica && usuariosIds && usuariosIds.length > 0) {
            formData.append('usuariosIds', JSON.stringify(usuariosIds));
        }

        if (this.archivoSeleccionado) {
            formData.append('archivo', this.archivoSeleccionado, this.archivoSeleccionado.name);
        }

        if (this.isEdit && this.data.minuta) {
            this._minutasService.actualizar(this.data.minuta.minutaId, formData).subscribe({
                next: (res) => {
                    this.guardando = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Minuta actualizada',
                        text: 'Los cambios fueron guardados exitosamente.',
                        timer: 1800,
                        showConfirmButton: false
                    });
                    this.dialogRef.close(true);
                },
                error: (err) => {
                    this.guardando = false;
                    console.error('Error al actualizar minuta:', err);
                    Swal.fire('Error', err?.error?.mensaje || 'No se pudo actualizar la minuta.', 'error');
                }
            });
        } else {
            this._minutasService.crear(formData).subscribe({
                next: (res) => {
                    this.guardando = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Minuta subida',
                        text: 'La minuta fue guardada y clasificada correctamente en la nube.',
                        timer: 1800,
                        showConfirmButton: false
                    });
                    this.dialogRef.close(true);
                },
                error: (err) => {
                    this.guardando = false;
                    console.error('Error al subir minuta:', err);
                    Swal.fire('Error', err?.error?.mensaje || 'No se pudo subir la minuta.', 'error');
                }
            });
        }
    }
}
