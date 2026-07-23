import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-importar-cronograma-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="flex flex-col w-full h-full max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b bg-slate-50 dark:bg-slate-800">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <mat-icon class="icon-size-6">cloud_upload</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800">Importar Cronograma desde Excel</h2>
            <p class="text-xs text-slate-500">Sube un archivo de cronograma (.xlsx) para extraer actividades y subactividades</p>
          </div>
        </div>
        <button mat-icon-button (click)="onClose()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-auto overflow-y-auto p-6 flex flex-col">
        <!-- Selector de Archivo -->
        <div *ngIf="!previewTasks.length && !isLoading" 
             class="flex-auto flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-2xl cursor-pointer p-12 transition-all bg-slate-50/30 group select-none min-h-[300px]"
             (click)="fileInput.click()">
          <input type="file" #fileInput class="hidden" accept=".xlsx" (change)="onFileChange($event)">
          <mat-icon class="icon-size-16 text-slate-300 group-hover:text-indigo-500 mb-4 transition-colors">excel</mat-icon>
          <span class="text-sm font-bold uppercase tracking-wider text-slate-600 group-hover:text-indigo-600 transition-colors">Seleccionar Archivo de Excel</span>
          <span class="text-xs text-slate-400 mt-2 text-center max-w-md">El archivo debe contener la columna de conceptos y el cronograma semanal en amarillo o con X, terminando al detectar "Resumen de Partidas".</span>
        </div>

        <!-- Loader -->
        <div *ngIf="isLoading" class="flex-auto flex flex-col items-center justify-center p-12 gap-4 min-h-[300px]">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <span class="text-sm font-bold text-slate-600">Procesando archivo excel...</span>
        </div>

        <!-- Vista Preliminar -->
        <div *ngIf="previewTasks.length && !isLoading" class="flex-auto flex flex-col min-h-0">
          <div class="flex items-center justify-between mb-4 flex-none">
            <span class="text-sm font-bold text-slate-700">Se detectaron {{ previewTasks.length }} Actividades Maestras y {{ getSubtasksCount() }} Subactividades</span>
            <button mat-stroked-button color="warn" (click)="clearPreview()" class="!rounded-xl">
              <mat-icon class="mr-2">delete</mat-icon>
              Limpiar y Cargar Otro
            </button>
          </div>

          <div class="flex-auto overflow-auto border rounded-xl custom-scrollbar max-h-[50vh]">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  <th class="p-3 font-bold uppercase text-slate-500 w-12">#</th>
                  <th class="p-3 font-bold uppercase text-slate-500">Actividad / Subactividad</th>
                  <th class="p-3 font-bold uppercase text-slate-500 text-center w-24">Inicio (Semana)</th>
                  <th class="p-3 font-bold uppercase text-slate-500 text-center w-24">Fin (Semana)</th>
                  <th class="p-3 font-bold uppercase text-slate-500 text-center w-20">Duración</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let item of previewTasks; let idx = index">
                  <!-- Actividad Maestra -->
                  <tr class="bg-indigo-50/20 font-bold border-b border-slate-100 hover:bg-indigo-50/40">
                    <td class="p-3 text-indigo-900">{{ idx + 1 }}</td>
                    <td class="p-3 text-indigo-950 uppercase text-[11px] font-black tracking-wide">{{ item.nombre }}</td>
                    <td class="p-3 text-center text-indigo-900">Semana {{ item.startWeek }}</td>
                    <td class="p-3 text-center text-indigo-900">Semana {{ item.endWeek }}</td>
                    <td class="p-3 text-center text-indigo-900">{{ item.durationWeeks }} sem</td>
                  </tr>
                  <!-- Subactividades -->
                  <tr *ngFor="let sub of item.actividades; let sIdx = index" class="border-b border-slate-100 hover:bg-slate-50/60">
                    <td class="p-3 text-slate-400 pl-6">{{ idx + 1 }}.{{ sIdx + 1 }}</td>
                    <td class="p-3 text-slate-700 pl-8 font-medium">{{ sub.nombre }}</td>
                    <td class="p-3 text-center text-slate-600">Semana {{ sub.startWeek }}</td>
                    <td class="p-3 text-center text-slate-600">Semana {{ sub.endWeek }}</td>
                    <td class="p-3 text-center text-slate-600">{{ sub.durationWeeks }} sem</td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-end px-6 py-4 border-t bg-slate-50 dark:bg-transparent gap-3 flex-none">
        <button mat-button (click)="onClose()">Cancelar</button>
        <button mat-flat-button color="primary" 
                [disabled]="!previewTasks.length || isLoading" 
                (click)="onConfirm()" 
                class="!rounded-xl shadow-md px-6">
          Confirmar e Importar al Gantt
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { 
        background: rgba(203, 213, 225, 0.6); 
        border-radius: 10px; 
    }
  `]
})
export class ImportarCronogramaDialogComponent implements OnInit {
  isLoading = false;
  previewTasks: any[] = [];

  constructor(
    private _dialogRef: MatDialogRef<ImportarCronogramaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { idSeguimiento: number; fechaInicioProyecto?: string }
  ) {}

  ngOnInit(): void {}

  onClose(): void {
    this._dialogRef.close();
  }

  clearPreview(): void {
    this.previewTasks = [];
  }

  getSubtasksCount(): number {
    return this.previewTasks.reduce((sum, t) => sum + (t.actividades ? t.actividades.length : 0), 0);
  }

  async onFileChange(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;
    try {
      const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));
      const workbook = new ExcelJS.Workbook();
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          const buffer = e.target.result;
          await workbook.xlsx.load(buffer);
          const sheet = workbook.worksheets[0];

          const tasks: any[] = [];
          let currentMaster: any = null;
          let foundResumen = false;

          // Empezamos en la fila 12
          for (let r = 12; r <= sheet.rowCount; r++) {
            const row = sheet.getRow(r);
            const col1Val = row.getCell(1).value;
            const col2Val = row.getCell(2).value;
            const col3Val = row.getCell(3).value;

            // Concatenar textos para buscar fin
            const rowStr = [col1Val, col2Val, col3Val].map(v => v ? String(v) : '').join(' ');
            if (rowStr.toLowerCase().includes('resumen de partidas')) {
              foundResumen = true;
              break;
            }

            // Buscar el nombre de la actividad
            const conceptVal = col3Val || col2Val || col1Val;
            if (!conceptVal) continue;

            let name = '';
            if (typeof conceptVal === 'object') {
              if ((conceptVal as any).text) {
                name = (conceptVal as any).text;
              } else if ((conceptVal as any).richText && Array.isArray((conceptVal as any).richText)) {
                name = (conceptVal as any).richText.map((rt: any) => rt.text || '').join('');
              } else {
                name = JSON.stringify(conceptVal);
              }
            } else {
              name = String(conceptVal);
            }
            if (!name || !name.trim() || name === '{}' || name.includes('[object Object]')) continue;

            // Determinar si es Actividad Maestra:
            // Es maestra si la celda original es Bold
            const font = row.getCell(3).font || row.getCell(2).font || row.getCell(1).font;
            const isBold = font ? !!font.bold : false;

            // Leer semanas marcadas (columnas 6 a 100)
            const activeWeeks: number[] = [];
            for (let c = 6; c <= 100; c++) {
              const cell = row.getCell(c);
              let hasFill = false;
              if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern !== 'none') {
                const fg = cell.fill.fgColor;
                const argb = fg ? fg.argb : '';
                // Color amarillo de Gantt es FFFFFF00
                if (argb === 'FFFFFF00' || cell.value === 'X' || cell.value === 'x') {
                  hasFill = true;
                }
              }
              if (hasFill) {
                activeWeeks.push(c - 5); // Semana 1, Semana 2...
              }
            }

            const startWeek = activeWeeks.length > 0 ? Math.min(...activeWeeks) : 1;
            const endWeek = activeWeeks.length > 0 ? Math.max(...activeWeeks) : startWeek;
            const durationWeeks = activeWeeks.length > 0 ? (endWeek - startWeek + 1) : 1;

            if (isBold) {
              // Actividad Maestra
              currentMaster = {
                nombre: name.trim(),
                startWeek: startWeek,
                endWeek: endWeek,
                durationWeeks: durationWeeks,
                actividades: []
              };
              tasks.push(currentMaster);
            } else {
              // Subactividad
              const subActivity = {
                nombre: name.trim(),
                startWeek: startWeek,
                endWeek: endWeek,
                durationWeeks: durationWeeks
              };
              if (currentMaster) {
                currentMaster.actividades.push(subActivity);
                // Expandir la maestra para contener a sus subactividades
                currentMaster.startWeek = Math.min(currentMaster.startWeek, subActivity.startWeek);
                currentMaster.endWeek = Math.max(currentMaster.endWeek, subActivity.endWeek);
                currentMaster.durationWeeks = currentMaster.endWeek - currentMaster.startWeek + 1;
              } else {
                // Si no hay maestra previa, la creamos genérica
                currentMaster = {
                  nombre: 'ACTIVIDAD MAESTRA GENERAL',
                  startWeek: subActivity.startWeek,
                  endWeek: subActivity.endWeek,
                  durationWeeks: subActivity.durationWeeks,
                  actividades: [subActivity]
                };
                tasks.push(currentMaster);
              }
            }
          }

          if (tasks.length === 0) {
            Swal.fire('Atención', 'No se encontraron actividades válidas en el archivo excel.', 'warning');
          } else {
            this.previewTasks = tasks;
          }
          this.isLoading = false;
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'No se pudo leer el archivo de Excel.', 'error');
          this.isLoading = false;
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo cargar exceljs o procesar el archivo.', 'error');
      this.isLoading = false;
    }
  }

  onConfirm(): void {
    // Retornamos las tareas procesadas para que el padre las guarde en el servidor
    this._dialogRef.close(this.previewTasks);
  }
}
