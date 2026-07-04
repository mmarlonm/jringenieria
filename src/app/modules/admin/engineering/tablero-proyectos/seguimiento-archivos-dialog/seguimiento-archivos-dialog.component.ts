import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EngineeringService } from '../../engineering.service';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-seguimiento-archivos-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ],
    template: `
        <div class="flex flex-col max-w-xl w-full max-h-[85vh] overflow-hidden bg-white text-default rounded-xl">
            <!-- Header -->
            <div class="flex flex-row items-center justify-between p-6 border-b bg-slate-50">
                <div class="flex flex-col">
                    <h2 class="text-xl font-bold uppercase tracking-tight text-primary">Archivos de Levantamiento y Cotización</h2>
                    <p class="text-xs text-slate-500 mt-1">Proyecto #{{ idSeguimiento }} &bull; {{ actividad }}</p>
                </div>
                <button mat-icon-button (click)="close()">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-auto overflow-y-auto p-6 space-y-6">
                <div *ngFor="let cat of categories" class="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col min-h-[160px]">
                    <!-- Category Header -->
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <mat-icon>{{ cat.icon }}</mat-icon>
                            </div>
                            <span class="text-xs font-black text-slate-800 uppercase tracking-wider">{{ cat.label }}</span>
                        </div>
                        <!-- Upload button -->
                        <button mat-icon-button (click)="fileInput.click()" [disabled]="isUploading[cat.name]" matTooltip="Subir archivo" class="text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <mat-icon>cloud_upload</mat-icon>
                        </button>
                        <input type="file" #fileInput class="hidden" (change)="onFileSelected($event, cat.name)">
                    </div>

                    <!-- Category Files List -->
                    <div class="space-y-2">
                        <!-- Loader -->
                        <div *ngIf="isUploading[cat.name]" class="flex items-center justify-center p-4 text-xs text-indigo-600 gap-2">
                            <mat-icon class="animate-spin">sync</mat-icon>
                            <span>Subiendo archivo...</span>
                        </div>

                        <div *ngIf="getFilesByCategory(cat.name).length === 0 && !isUploading[cat.name]" 
                             (click)="fileInput.click()"
                             class="flex flex-col items-center justify-center py-6 text-slate-400 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-xl cursor-pointer transition-all bg-slate-50/50 hover:bg-indigo-50/20 group select-none">
                            <mat-icon class="text-slate-300 group-hover:text-indigo-500 mb-2 transition-colors">cloud_upload</mat-icon>
                            <span class="text-[10px] font-bold uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Subir Archivo</span>
                        </div>

                        <div *ngFor="let file of getFilesByCategory(cat.name)" class="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 rounded-xl transition-all group">
                            <span class="text-xs font-bold text-slate-700 truncate pr-2 flex-auto" [title]="file.nombreArchivo">
                                {{ file.nombreArchivo }}
                            </span>
                            <div class="flex items-center gap-0.5 shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
                                <!-- Preview -->
                                <button mat-icon-button class="w-7 h-7 min-h-7 p-0 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 rounded-lg" (click)="previsualizarArchivo(file)" matTooltip="Ver">
                                    <mat-icon class="icon-size-4">visibility</mat-icon>
                                </button>
                                <!-- Download -->
                                <button mat-icon-button class="w-7 h-7 min-h-7 p-0 text-slate-400 hover:text-emerald-600 hover:bg-slate-200/50 rounded-lg" (click)="descargarArchivo(file)" matTooltip="Descargar">
                                    <mat-icon class="icon-size-4">download</mat-icon>
                                </button>
                                <!-- Delete -->
                                <button mat-icon-button class="w-7 h-7 min-h-7 p-0 text-slate-400 hover:text-red-600 hover:bg-slate-200/50 rounded-lg" (click)="eliminarArchivo(file)" matTooltip="Eliminar">
                                    <mat-icon class="icon-size-4">delete_forever</mat-icon>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end p-6 border-t bg-slate-50">
                <button mat-flat-button color="primary" class="rounded-xl px-8" (click)="close()">
                    Listo
                </button>
            </div>
        </div>
    `
})
export class SeguimientoArchivosDialogComponent implements OnInit {
    idSeguimiento: number;
    actividad: string;

    categories = [
        { name: 'Levantamiento', label: 'Levantamiento Técnico', icon: 'engineering' },
        { name: 'Cotizacion', label: 'Cotización / Propuesta', icon: 'assignment' }
    ];

    archivos: { nombreArchivo: string, tipo: string }[] = [];
    isUploading: { [key: string]: boolean } = {};

    constructor(
        private _dialogRef: MatDialogRef<SeguimientoArchivosDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { idSeguimiento: number, actividad: string },
        private _engineeringService: EngineeringService,
        private _dialog: MatDialog
    ) {
        this.idSeguimiento = data.idSeguimiento;
        this.actividad = data.actividad;
    }

    ngOnInit(): void {
        this.loadFiles();
    }

    loadFiles(): void {
        this._engineeringService.getArchivosEjecucion(this.idSeguimiento).subscribe({
            next: (res) => {
                this.archivos = res || [];
            },
            error: (err) => {
                console.error('Error al cargar archivos:', err);
            }
        });
    }

    getFilesByCategory(categoryName: string): any[] {
        return this.archivos.filter(a => a.tipo === categoryName);
    }

    onFileSelected(event: any, categoryName: string): void {
        const file = event.target.files[0];
        if (!file) return;

        this.isUploading[categoryName] = true;
        this._engineeringService.subirArchivoEjecucion(this.idSeguimiento, file, categoryName).subscribe({
            next: () => {
                this.isUploading[categoryName] = false;
                Swal.fire({
                    title: '¡Subido!',
                    text: 'Archivo cargado con éxito.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                this.loadFiles();
            },
            error: (err) => {
                this.isUploading[categoryName] = false;
                console.error(err);
                Swal.fire('Error', 'No se pudo subir el archivo.', 'error');
            }
        });
        event.target.value = '';
    }

    descargarArchivo(file: any): void {
        this._engineeringService.descargarArchivoEjecucion(this.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
            next: (res) => {
                if (res && res.data) {
                    const byteCharacters = atob(res.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: res.contentType });

                    const a = document.createElement('a');
                    const objectUrl = URL.createObjectURL(blob);
                    a.href = objectUrl;
                    a.download = file.nombreArchivo;
                    a.click();
                    URL.revokeObjectURL(objectUrl);
                }
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo descargar el archivo.', 'error');
            }
        });
    }

    previsualizarArchivo(file: any): void {
        this._engineeringService.descargarArchivoEjecucion(this.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
            next: (res) => {
                if (res && res.data) {
                    const byteCharacters = atob(res.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: res.contentType });
                    const fileURL = URL.createObjectURL(blob);
                    
                    const isPdf = file.nombreArchivo.toLowerCase().endsWith('.pdf');

                    this._dialog.open(ImagePreviewDialogComponent, {
                        data: {
                            url: fileURL,
                            name: file.nombreArchivo,
                            isPdf: isPdf
                        }
                    });
                }
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo previsualizar el archivo.', 'error');
            }
        });
    }

    eliminarArchivo(file: any): void {
        Swal.fire({
            title: '¿Eliminar archivo?',
            text: `¿Estás seguro de eliminar el archivo "${file.nombreArchivo}"?`,
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
                this._engineeringService.eliminarArchivoEjecucion(this.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
                    next: () => {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El archivo ha sido eliminado.',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        this.loadFiles();
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error');
                    }
                });
            }
        });
    }

    close(): void {
        this._dialogRef.close();
    }
}
