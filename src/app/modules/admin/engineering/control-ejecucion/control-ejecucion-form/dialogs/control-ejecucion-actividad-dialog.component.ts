import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CdkDrag, CdkDragHandle, CdkDragEnd } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-control-ejecucion-actividad-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    TextFieldModule,
    CdkDrag,
    CdkDragHandle
  ],
  template: `
    <div class="flex flex-col max-w-160 min-w-80 overflow-hidden bg-card text-default"
         cdkDrag
         cdkDragRootElement=".cdk-overlay-pane"
         [cdkDragFreeDragPosition]="dragPosition"
         (cdkDragEnded)="onDragEnded($event)">
      <div class="flex items-center justify-between px-6 py-4 border-b cursor-move select-none" cdkDragHandle>
        <h2 class="text-lg font-bold">
          {{ data.isEdit ? 'Editar' : 'Nueva' }} 
          {{ data.type === 'maestra' ? 'Actividad Maestra' : 'Subactividad' }}
        </h2>
        <button mat-icon-button (click)="onCancel()" [tabIndex]="-1">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" class="flex flex-col p-6 space-y-4 overflow-y-auto max-h-[70vh]">
        <!-- Nombre -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nombre</mat-label>
          <textarea matInput formControlName="nombre" placeholder="Ej. Diseño Estructural" rows="2" cdkTextareaAutosize></textarea>
          <mat-icon matSuffix class="text-secondary">description</mat-icon>
        </mat-form-field>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Responsable (Opcional para Maestra, sugerido para subactividad) -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Responsables</mat-label>
            <mat-select formControlName="responsablesIds" multiple>
              <mat-option *ngFor="let user of data.userList" [value]="user.usuarioId">
                <div class="flex items-center gap-3 py-1">
                  <div class="flex-none w-7 h-7 rounded-full overflow-hidden border shadow-sm bg-slate-200">
                    <img *ngIf="user.avatar" [src]="user.avatar" class="w-full h-full object-cover">
                    <div *ngIf="!user.avatar" 
                         class="w-full h-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
                         [style.background-color]="getUserColor(user.nombreUsuario)">
                      {{ getUserInitials(user.nombreUsuario) }}
                    </div>
                  </div>
                  <span class="text-sm font-medium">{{ user.nombreUsuario }}</span>
                </div>
              </mat-option>
            </mat-select>
            <mat-icon matSuffix class="text-secondary">people</mat-icon>
          </mat-form-field>

          <!-- Equipo de Trabajo (JR / Subcontratados) -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Equipo de Trabajo</mat-label>
            <mat-select formControlName="equipoIds" multiple>
              <mat-optgroup label="Personal JR">
                <mat-option *ngFor="let u of data.equiposDisponibles?.jr" [value]="'JR-' + u.id">
                  {{ u.nombre }}
                </mat-option>
              </mat-optgroup>
              <mat-optgroup label="Personal Subcontratado">
                <mat-option *ngFor="let s of data.equiposDisponibles?.subcontratado" [value]="'SUBCONTRATADO-' + s.id">
                  {{ s.nombre }}
                </mat-option>
              </mat-optgroup>
            </mat-select>
            <mat-icon matSuffix class="text-secondary">groups</mat-icon>
          </mat-form-field>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Área -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Área / Departamento</mat-label>
            <input matInput formControlName="area" placeholder="Ej. Ingeniería" />
            <mat-icon matSuffix class="text-secondary">business</mat-icon>
          </mat-form-field>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Fechas -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Fecha Inicio</mat-label>
            <input matInput [matDatepicker]="pickerInicio" formControlName="fechaInicio" />
            <mat-datepicker-toggle matSuffix [for]="pickerInicio"></mat-datepicker-toggle>
            <mat-datepicker #pickerInicio></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Fecha Fin</mat-label>
            <input matInput [matDatepicker]="pickerFin" formControlName="fechaFin" />
            <mat-datepicker-toggle matSuffix [for]="pickerFin"></mat-datepicker-toggle>
            <mat-datepicker #pickerFin></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Progreso -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Progreso (%)</mat-label>
            <input matInput type="number" formControlName="progreso" min="0" max="100" />
            <mat-icon matSuffix class="text-secondary">trending_up</mat-icon>
          </mat-form-field>

          <!-- Predecesora (Solo si hay predecesoras disponibles) -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Predecesora</mat-label>
            <mat-select formControlName="predecesoraId">
              <mat-option [value]="null">Ninguna</mat-option>
              <mat-option *ngFor="let act of data.predecesoras" [value]="act.id">
                {{ act.nombre }}
              </mat-option>
            </mat-select>
            <mat-icon matSuffix class="text-secondary">link</mat-icon>
          </mat-form-field>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Prioridad -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Prioridad</mat-label>
            <mat-select formControlName="prioridad">
              <mat-option value="Baja">Baja</mat-option>
              <mat-option value="Media">Media</mat-option>
              <mat-option value="Alta">Alta</mat-option>
              <mat-option value="Muy Alta">Muy Alta</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Estatus -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Estatus</mat-label>
            <mat-select formControlName="estatus">
              <mat-option [value]="1">Pendiente</mat-option>
              <mat-option [value]="2">En Proceso</mat-option>
              <mat-option [value]="3">Completado</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Color Selection -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Color de la barra</mat-label>
            <mat-select formControlName="color">
              <mat-option *ngFor="let c of colors" [value]="c.value">
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded-full border border-slate-300" [style.background-color]="c.hex"></div>
                  <span>{{ c.label }}</span>
                </div>
              </mat-option>
            </mat-select>
            <mat-icon matSuffix class="text-secondary">palette</mat-icon>
          </mat-form-field>

          <!-- Herramienta o Equipo Especial -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Herramienta o Equipo Especial</mat-label>
            <input matInput formControlName="equipoEspecial" placeholder="Ej. Plataforma de elevación, grúa, montacargas" />
            <mat-icon matSuffix class="text-secondary">build</mat-icon>
          </mat-form-field>
        </div>
      </form>

      <div class="flex items-center justify-between px-6 py-4 border-t bg-gray-50 dark:bg-transparent">
        <div>
          <button *ngIf="data.isEdit" mat-icon-button color="warn" (click)="onDelete()" matTooltip="Eliminar">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button mat-button (click)="onCancel()">Cancelar</button>
          <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">
            {{ data.isEdit ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ControlEjecucionActividadDialogComponent implements OnInit {
  private static readonly POSITION_STORAGE_KEY = 'ce-actividad-dialog-position';

  /** Posición libre del modal, restaurada desde localStorage si existe. */
  dragPosition: { x: number; y: number } = { x: 0, y: 0 };

  form: FormGroup;
  colors = [
    { label: 'Azul', value: 'Azul', hex: '#3b82f6' },
    { label: 'Verde', value: 'Verde', hex: '#10b981' },
    { label: 'Amarillo', value: 'Amarillo', hex: '#f59e0b' },
    { label: 'Morado', value: 'Morado', hex: '#8b5cf6' },
    { label: 'Naranja', value: 'Naranja', hex: '#f97316' },
    { label: 'Rosa', value: 'Rosa', hex: '#ec4899' }
  ];

  private _palette: string[] = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];
  private _userColors: { [key: string]: string } = {};

  constructor(
    private _dialogRef: MatDialogRef<ControlEjecucionActividadDialogComponent>,
    private _fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: {
      type: 'maestra' | 'subactividad';
      isEdit: boolean;
      actividad?: any;
      userList: any[];
      predecesoras: any[];
      equiposDisponibles: any;
      equipoAsignado: any[];
    }
  ) {
    this.form = this._fb.group({
      nombre: ['', [Validators.required]],
      responsablesIds: [[]],
      equipoIds: [[]],
      area: [''],
      fechaInicio: [new Date(), [Validators.required]],
      fechaFin: [new Date(), [Validators.required]],
      estatus: [1, [Validators.required]],
      progreso: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      predecesoraId: [null],
      prioridad: ['Media'],
      color: ['Azul'],
      equipoEspecial: ['']
    });

    this.dragPosition = this._loadPosition();
  }

  /** Guarda la posición del modal cada vez que el usuario termina de arrastrarlo. */
  onDragEnded(event: CdkDragEnd): void {
    const pos = event.source.getFreeDragPosition();
    this.dragPosition = { x: pos.x, y: pos.y };
    this._savePosition(this.dragPosition);
  }

  private _loadPosition(): { x: number; y: number } {
    try {
      const raw = localStorage.getItem(ControlEjecucionActividadDialogComponent.POSITION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return { x: parsed.x, y: parsed.y };
        }
      }
    } catch {
      // Ignorar valores corruptos y usar la posición por defecto (centrado).
    }
    return { x: 0, y: 0 };
  }

  private _savePosition(pos: { x: number; y: number }): void {
    try {
      localStorage.setItem(
        ControlEjecucionActividadDialogComponent.POSITION_STORAGE_KEY,
        JSON.stringify(pos)
      );
    } catch {
      // Almacenamiento no disponible (modo privado / cuota); se ignora.
    }
  }

  ngOnInit(): void {
    if (this.data.actividad) {
      let selectedIds: number[] = [];
      if (this.data.actividad.responsablesIds) {
        selectedIds = this.data.actividad.responsablesIds.split(',')
          .map((x: string) => Number(x.trim()))
          .filter((x: number) => !isNaN(x) && x > 0);
      } else if (this.data.actividad.responsableId) {
        selectedIds = [this.data.actividad.responsableId];
      }

      // Mapear equipo asignado actual
      let currentEquipoStrings: string[] = [];
      if (this.data.equipoAsignado && this.data.equipoAsignado.length > 0) {
        currentEquipoStrings = this.data.equipoAsignado.map(e => `${e.origen.toUpperCase()}-${e.idMiembro}`);
      }

      this.form.patchValue({
        ...this.data.actividad,
        fechaInicio: this.data.actividad.fechaInicio ? new Date(this.data.actividad.fechaInicio) : new Date(),
        fechaFin: this.data.actividad.fechaFin ? new Date(this.data.actividad.fechaFin) : new Date(),
        predecesoraId: this.data.actividad.predecesoraId || null,
        responsablesIds: selectedIds,
        equipoIds: currentEquipoStrings
      });
    }

    if (this.data.type === 'maestra') {
      this.form.get('color').setValue(this.data.actividad?.color || 'Azul');
    } else {
      this.form.get('color').setValue(this.data.actividad?.color || 'Verde');
    }
  }

  onCancel(): void {
    this._dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) return;

    const val = this.form.value;
    const selectedIds: number[] = val.responsablesIds || [];
    const names = selectedIds.map(id => {
      const u = this.data.userList.find(user => user.usuarioId === id);
      return u ? u.nombreUsuario : '';
    }).filter(n => !!n);

    // Mapear el equipo de trabajo seleccionado de vuelta
    const selectedEquipoStrings: string[] = val.equipoIds || [];
    const equipoMiembros = selectedEquipoStrings.map(str => {
      const parts = str.split('-');
      return {
        origen: parts[0],
        idMiembro: Number(parts[1])
      };
    });

    const result = {
      ...this.data.actividad,
      ...val,
      nombreResponsable: names.join(', '),
      responsableId: selectedIds.length > 0 ? selectedIds[0] : null,
      responsablesIds: selectedIds.join(','),
      equipoMiembros: equipoMiembros
    };

    this._dialogRef.close(result);
  }

  onDelete(): void {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      this._dialogRef.close({ delete: true, id: this.data.actividad?.id });
    }
  }

  getUserInitials(name: string): string {
    if (!name) return '?';
    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0] ? names[0][0].toUpperCase() : '?';
  }

  getUserColor(name: string): string {
    if (!name) return '#cbd5e0';
    if (!this._userColors[name]) {
        const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const colorIdx = Math.abs(hash) % this._palette.length;
        this._userColors[name] = this._palette[colorIdx];
    }
    return this._userColors[name];
  }
}
