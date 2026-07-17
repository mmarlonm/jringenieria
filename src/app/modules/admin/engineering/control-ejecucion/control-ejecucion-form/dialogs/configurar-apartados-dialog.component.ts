import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { EngineeringService } from '../../../engineering.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configurar-apartados-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    DragDropModule
  ],
  template: `
    <div class="flex flex-col max-w-180 w-[550px] overflow-hidden bg-card text-default">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b">
        <div class="flex items-center gap-2">
          <mat-icon class="text-indigo-600">settings</mat-icon>
          <h2 class="text-lg font-bold">Configurar Apartados</h2>
        </div>
        <button mat-icon-button (click)="onClose()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-auto p-6 overflow-y-auto max-h-[60vh] space-y-4">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Organiza, renombra o agrega apartados. Arrastra las filas para reordenar.
        </p>

        <!-- Dynamic List -->
        <div cdkDropList class="space-y-2" (cdkDropListDropped)="drop($event)">
          <div *ngFor="let item of apartadosLocales; let idx = index" 
               cdkDrag 
               class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-sm transition-all relative group bg-white">
            <!-- Drag Handle -->
            <div cdkDragHandle class="cursor-move text-slate-400 hover:text-slate-600 flex items-center justify-center">
              <mat-icon class="icon-size-5">drag_indicator</mat-icon>
            </div>

            <!-- Icon preview & Select -->
            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <mat-icon class="icon-size-5" [svgIcon]="item.icon || 'heroicons_outline:folder'"></mat-icon>
            </div>

            <!-- Info / Form -->
            <div class="flex-auto min-w-0">
              <div *ngIf="!item.esEditable" class="text-sm font-bold text-slate-700 select-none px-2 py-1">
                {{ item.label }} <span class="text-[9px] uppercase tracking-wider font-extrabold text-indigo-500 ml-2 bg-indigo-50 px-1.5 py-0.5 rounded">Core</span>
              </div>
              <input *ngIf="item.esEditable" 
                     type="text" 
                     class="w-full text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/50 focus:bg-white border-0 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 transition-all" 
                     [(ngModel)]="item.label" 
                     placeholder="Nombre del apartado" />
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <!-- Delete Custom Category -->
              <button *ngIf="item.esEditable" 
                      mat-icon-button 
                      color="warn" 
                      class="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500" 
                      (click)="eliminarApartado(idx)" 
                      matTooltip="Eliminar apartado">
                <mat-icon class="icon-size-4">delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer / Actions -->
      <div class="flex items-center justify-between px-6 py-4 border-t bg-slate-50">
        <button mat-stroked-button type="button" (click)="agregarApartado()" class="!rounded-xl border-slate-200">
          <mat-icon class="mr-2">add</mat-icon>
          Agregar Apartado
        </button>
        <div class="flex items-center gap-3">
          <button mat-button (click)="onClose()">Cancelar</button>
          <button mat-flat-button color="primary" [disabled]="isSaving" (click)="onSave()" class="!rounded-xl shadow-md hover:shadow-lg">
            <mat-icon class="mr-2 animate-spin icon-size-4" *ngIf="isSaving">sync</mat-icon>
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .cdk-drag-preview {
      box-shadow: 0 5px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-radius: 12px;
      background-color: white;
      opacity: 0.9;
    }
  `]
})
export class ConfigurarApartadosDialogComponent implements OnInit {
  apartadosLocales: any[] = [];
  isSaving = false;

  constructor(
    private _dialogRef: MatDialogRef<ConfigurarApartadosDialogComponent>,
    private _engineeringService: EngineeringService,
    @Inject(MAT_DIALOG_DATA) public data: { idSeguimiento: number; apartados: any[] }
  ) {}

  ngOnInit(): void {
    // Clonar apartados recibidos para trabajar de forma aislada
    this.apartadosLocales = JSON.parse(JSON.stringify(this.data.apartados));
  }

  drop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.apartadosLocales, event.previousIndex, event.currentIndex);
    // Reasignar el orden en base al nuevo index
    this.apartadosLocales.forEach((item, idx) => {
      item.orden = idx + 1;
    });
  }

  agregarApartado(): void {
    const nuevo = {
      id: 0,
      idSeguimiento: this.data.idSeguimiento,
      nombre: '',
      label: 'Nuevo Apartado',
      icon: 'heroicons_outline:folder',
      orden: this.apartadosLocales.length + 1,
      esEditable: true
    };
    this.apartadosLocales.push(nuevo);
  }

  eliminarApartado(index: number): void {
    const item = this.apartadosLocales[index];
    if (item.id > 0) {
      Swal.fire({
        title: '¿Eliminar apartado?',
        text: `Al eliminar el apartado "${item.label}" se borrarán permanentemente todos sus archivos adjuntos. ¿Estás seguro?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: {
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mx-2',
          cancelButton: 'bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded mx-2'
        },
        buttonsStyling: false
      }).then((result) => {
        if (result.isConfirmed) {
          this.apartadosLocales.splice(index, 1);
        }
      });
    } else {
      this.apartadosLocales.splice(index, 1);
    }
  }

  onClose(): void {
    this._dialogRef.close();
  }

  onSave(): void {
    // Validar etiquetas vacías
    if (this.apartadosLocales.some(a => !a.label || a.label.trim() === '')) {
      Swal.fire('Error', 'Todos los apartados deben tener un nombre válido.', 'error');
      return;
    }

    this.isSaving = true;
    this._engineeringService.sincronizarApartadosEjecucion(this.data.idSeguimiento, this.apartadosLocales).subscribe({
      next: (res) => {
        this.isSaving = false;
        Swal.fire({
          title: 'Guardado',
          text: 'Configuración de apartados actualizada correctamente.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        this._dialogRef.close(res);
      },
      error: (err) => {
        this.isSaving = false;
        console.error(err);
        Swal.fire('Error', 'No se pudieron sincronizar los apartados.', 'error');
      }
    });
  }
}
