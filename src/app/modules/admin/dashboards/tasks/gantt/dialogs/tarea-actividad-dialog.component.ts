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
import { TextFieldModule } from '@angular/cdk/text-field';
import { TareaActividad } from '../../models/task-activity.model';

@Component({
  selector: 'app-tarea-actividad-dialog',
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
    MatIconModule,
    TextFieldModule
  ],
  template: `
    <div class="flex flex-col max-w-160 min-w-80 overflow-hidden bg-card text-default">
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <h2 class="text-lg font-semibold">{{ data.actividad ? 'Editar Actividad' : 'Nueva Actividad' }}</h2>
        <button mat-icon-button (click)="onCancel()" [tabIndex]="-1">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" class="flex flex-col p-6 space-y-4 overflow-y-auto">
        <!-- Nombre -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nombre de la actividad</mat-label>
          <textarea matInput formControlName="nombre" placeholder="Ej. Diseño de UI" rows="2" cdkTextareaAutosize></textarea>
          <mat-icon matSuffix class="text-secondary">description</mat-icon>
        </mat-form-field>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Responsable -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Responsable</mat-label>
            <mat-select formControlName="responsableId">
              <mat-option *ngFor="let user of data.userList" [value]="user.usuarioId">
                <div class="flex items-center gap-3 py-1">
                  <div class="flex-none w-7 h-7 rounded-full overflow-hidden border shadow-sm">
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
            <mat-icon matSuffix class="text-secondary">person</mat-icon>
          </mat-form-field>

          <!-- Estatus -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Estatus</mat-label>
            <mat-select formControlName="estatus">
              <mat-option [value]="1">Pendiente</mat-option>
              <mat-option [value]="2">En Proceso</mat-option>
              <mat-option [value]="3">Hecho</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Fechas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <!-- Progreso y Predecesora -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Progreso (%)</mat-label>
            <input matInput type="number" formControlName="progreso" min="0" max="100" />
            <mat-icon matSuffix class="text-secondary">trending_up</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Predecesora</mat-label>
            <mat-select formControlName="predecesoraId">
              <mat-option [value]="null">Ninguna</mat-option>
              <mat-option *ngFor="let act of data.activities" [value]="act.id">
                {{ act.nombre }}
              </mat-option>
            </mat-select>
            <mat-icon matSuffix class="text-secondary">link</mat-icon>
          </mat-form-field>
        </div>
      </form>

      <div class="flex items-center justify-between px-6 py-4 border-t bg-gray-50 dark:bg-transparent">
        <div>
          <button *ngIf="data.actividad" mat-icon-button color="warn" (click)="onDelete()" matTooltip="Eliminar actividad">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button mat-button (click)="onCancel()">Cancelar</button>
          <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="onSave()">
            {{ data.actividad ? 'Actualizar' : 'Crear' }} Actividad
          </button>
        </div>
      </div>
    </div>
  `
})
export class TareaActividadDialogComponent implements OnInit {
  form: FormGroup;
  private _palette: string[] = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];
  private _userColors: { [key: string]: string } = {};

  constructor(
    private _dialogRef: MatDialogRef<TareaActividadDialogComponent>,
    private _fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: { 
      actividad?: TareaActividad, 
      userList: any[], 
      activities: TareaActividad[] 
    }
  ) {
    this.form = this._fb.group({
      nombre: ['', [Validators.required]],
      responsableId: [null, [Validators.required]],
      fechaInicio: [new Date(), [Validators.required]],
      fechaFin: [new Date(), [Validators.required]],
      estatus: [1, [Validators.required]],
      progreso: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      predecesoraId: [null]
    });
  }

  ngOnInit(): void {
    if (this.data.actividad) {
      this.form.patchValue({
        ...this.data.actividad,
        fechaInicio: this.data.actividad.fechaInicio ? new Date(this.data.actividad.fechaInicio) : new Date(),
        fechaFin: this.data.actividad.fechaFin ? new Date(this.data.actividad.fechaFin) : new Date()
      });
    }
  }

  onCancel(): void {
    this._dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) return;

    const val = this.form.value;
    // Encontrar el nombre del responsable para guardar en el objeto
    const resp = this.data.userList.find(u => u.usuarioId === val.responsableId);
    
    const result: TareaActividad = {
      ...this.data.actividad,
      ...val,
      nombreResponsable: resp ? resp.nombreUsuario : ''
    };

    this._dialogRef.close(result);
  }
  
  onDelete(): void {
    if (confirm('¿Estás seguro de eliminar esta actividad?')) {
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
