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
import { Minuta, MinutaCatalogos } from './minutas.types';
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
        <div class="flex flex-col max-w-160 w-full overflow-hidden bg-card rounded-2xl shadow-xl">
            <!-- Header -->
            <div class="flex items-center justify-between h-16 pl-6 pr-4 bg-[#212529] text-white">
                <div class="flex items-center">
                    <mat-icon class="text-current" [svgIcon]="isEdit ? 'heroicons_outline:pencil' : 'heroicons_outline:cloud-arrow-up'"></mat-icon>
                    <span class="ml-2 text-lg font-semibold tracking-tight">{{ isEdit ? 'Editar Minuta' : 'Subir Minuta' }}</span>
                </div>
                <button mat-icon-button (click)="cancelar()" [tabIndex]="-1">
                    <mat-icon class="text-current" [svgIcon]="'heroicons_outline:x-mark'"></mat-icon>
                </button>
            </div>

            <!-- Content -->
            <form [formGroup]="form" class="p-6 sm:p-8 overflow-y-auto space-y-4 max-h-[75vh]">
                <!-- Título -->
                <mat-form-field class="w-full" [subscriptSizing]="'dynamic'">
                    <mat-label>Título de la Minuta o Reunión</mat-label>
                    <input matInput formControlName="titulo" placeholder="Ej. Minuta de Revisión por la Dirección - Q4" required>
                    <mat-error *ngIf="form.get('titulo')?.hasError('required')">El título es requerido</mat-error>
                </mat-form-field>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Sucursal -->
                    <mat-form-field [subscriptSizing]="'dynamic'">
                        <mat-label>Sucursal</mat-label>
                        <mat-select formControlName="sucursalId">
                            <mat-option [value]="null">Todas las sucursales</mat-option>
                            @for (s of catalogos.sucursales; track s.sucursalId) {
                                <mat-option [value]="s.sucursalId">{{ s.nombre }}</mat-option>
                            }
                        </mat-select>
                    </mat-form-field>

                    <!-- Fecha de Reunión -->
                    <mat-form-field [subscriptSizing]="'dynamic'">
                        <mat-label>Fecha de la Reunión</mat-label>
                        <input matInput type="date" formControlName="fechaReunion" required>
                        <mat-error *ngIf="form.get('fechaReunion')?.hasError('required')">La fecha es requerida</mat-error>
                    </mat-form-field>
                </div>

                <!-- Palabras Clave -->
                <mat-form-field class="w-full" [subscriptSizing]="'dynamic'">
                    <mat-label>Palabras Clave (separadas por comas)</mat-label>
                    <mat-icon matPrefix class="icon-size-5" [svgIcon]="'heroicons_outline:tag'"></mat-icon>
                    <input matInput formControlName="palabrasClave" placeholder="calidad, auditoría, no conformidad, compras, mantenimiento">
                </mat-form-field>

                <!-- Resumen / Temas -->
                <mat-form-field class="w-full" [subscriptSizing]="'dynamic'">
                    <mat-label>Resumen o Temas Tratados</mat-label>
                    <textarea matInput formControlName="descripcion" rows="3" placeholder="Acuerdos principales, notas o compromisos..."></textarea>
                </mat-form-field>

                <!-- Visibilidad -->
                <div class="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-sm font-semibold text-gray-900">Visibilidad de la Minuta</div>
                            <div class="text-xs text-secondary mt-0.5">
                                {{ form.get('esPublica')?.value ? 'Pública: visible para todos los usuarios' : 'Restringida: únicamente visible para los usuarios seleccionados' }}
                            </div>
                        </div>
                        <mat-slide-toggle formControlName="esPublica" color="primary">
                            {{ form.get('esPublica')?.value ? 'Pública' : 'Restringida' }}
                        </mat-slide-toggle>
                    </div>

                    <!-- Selector de usuarios si es privada -->
                    <div *ngIf="!form.get('esPublica')?.value" class="mt-4 pt-3 border-t border-gray-200">
                        <mat-form-field class="w-full" [subscriptSizing]="'dynamic'">
                            <mat-label>Usuarios con acceso</mat-label>
                            <mat-select formControlName="usuariosIds" multiple placeholder="Seleccionar usuarios">
                                @for (u of catalogos.usuarios; track u.usuarioId) {
                                    <mat-option [value]="u.usuarioId">{{ u.nombre }}</mat-option>
                                }
                            </mat-select>
                        </mat-form-field>
                        <div class="text-[11px] text-secondary mt-1">
                            Los administradores y tú (como autor) siempre podrán consultarla.
                        </div>
                    </div>
                </div>

                <!-- Archivo adjunto -->
                <div>
                    <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Archivo Adjunto {{ isEdit ? '(Opcional para reemplazar)' : '*' }}
                    </div>

                    <div (dragover)="onDragOver($event)"
                         (dragleave)="onDragLeave($event)"
                         (drop)="onFileDrop($event)"
                         (click)="fileInput.click()"
                         [ngClass]="{
                            'border-primary bg-primary-50/20': isDragging,
                            'border-gray-300 bg-gray-50 hover:bg-gray-100': !isDragging
                         }"
                         class="cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-colors flex flex-col items-center justify-center">
                        <input #fileInput type="file" (change)="onFileSelected($event)" class="hidden"
                               accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt,.zip">
                        
                        <mat-icon class="icon-size-8 text-primary mb-2" [svgIcon]="'heroicons_outline:arrow-up-tray'"></mat-icon>

                        <div *ngIf="!archivoSeleccionado && !archivoActualNombre" class="text-sm">
                            <span class="font-semibold text-primary">Haz clic para examinar</span> o arrastra tu archivo aquí
                            <div class="text-xs text-secondary mt-1">PDF, Word, Excel, PowerPoint, imágenes o ZIP (hasta 50 MB)</div>
                        </div>

                        <div *ngIf="archivoSeleccionado" class="flex items-center gap-2">
                            <mat-icon class="icon-size-5 text-primary" [svgIcon]="'heroicons_outline:document-text'"></mat-icon>
                            <span class="font-semibold text-sm">{{ archivoSeleccionado.name }}</span>
                            <span class="text-xs text-secondary">({{ formatearTamano(archivoSeleccionado.size) }})</span>
                            <button type="button" mat-icon-button (click)="$event.stopPropagation(); removerArchivo()" class="text-gray-400 hover:text-rose-600">
                                <mat-icon class="icon-size-4">close</mat-icon>
                            </button>
                        </div>

                        <div *ngIf="!archivoSeleccionado && archivoActualNombre" class="text-sm">
                            <span class="font-medium text-gray-700">Archivo actual: {{ archivoActualNombre }}</span>
                            <div class="text-xs text-secondary mt-1">Haz clic o arrastra para reemplazarlo si deseas</div>
                        </div>
                    </div>
                </div>
            </form>

            <!-- Actions -->
            <div class="flex items-center justify-end px-6 py-4 bg-gray-50 border-t border-gray-100 gap-3">
                <button mat-button type="button" (click)="cancelar()" [disabled]="guardando">
                    Cancelar
                </button>
                <button mat-flat-button color="primary" type="button" (click)="guardar()" [disabled]="guardando || form.invalid">
                    <mat-progress-spinner *ngIf="guardando" [diameter]="18" mode="indeterminate" class="mr-2"></mat-progress-spinner>
                    <span>{{ isEdit ? 'Guardar Cambios' : 'Subir Minuta' }}</span>
                </button>
            </div>
        </div>
    `
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
                next: () => {
                    this.guardando = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Minuta actualizada',
                        text: 'Los cambios fueron guardados exitosamente.',
                        timer: 1600,
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
                next: () => {
                    this.guardando = false;
                    Swal.fire({
                        icon: 'success',
                        title: 'Minuta subida',
                        text: 'La minuta fue guardada exitosamente.',
                        timer: 1600,
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
