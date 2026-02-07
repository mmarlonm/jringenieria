import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { Task } from '../models/tasks.model';
import { TaskService } from '../tasks.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'task-media-dialog',
    templateUrl: './task-media-dialog.component.html',
    styleUrls: ['./task-media-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatDividerModule,
        MatFormFieldModule,
        MatSelectModule,
        FormsModule
    ]
})
export class TaskMediaDialogComponent implements OnInit {
    task: Task;
    files: any[] = [];
    tareaId: number;

    selectedFile: File | null = null;
    categoriaArchivo: string = 'General';

    constructor(
        public dialogRef: MatDialogRef<TaskMediaDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { task: Task },
        private _taskService: TaskService
    ) {
        this.task = data.task;
        this.tareaId = this.task.id!;
    }

    ngOnInit(): void {
        this.loadFiles();
    }

    loadFiles(): void {
        if (!this.tareaId) return;

        this._taskService.getFiles(this.tareaId).subscribe(res => {
            this.files = res;
        });
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
        }
    }

    uploadFile(): void {
        if (!this.selectedFile || !this.tareaId) return;

        const formData = new FormData();
        formData.append('tareaId', this.tareaId.toString());
        formData.append('categoria', this.categoriaArchivo);
        formData.append('archivo', this.selectedFile);

        this._taskService.uploadFile(formData).subscribe({
            next: () => {
                this.loadFiles();
                this.selectedFile = null;
                this.categoriaArchivo = 'General';
                Swal.fire({
                    icon: 'success',
                    title: '¡Archivo subido!',
                    text: 'El archivo se ha subido correctamente.',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
            },
            error: (err) => {
                console.error('Error al subir el archivo:', err);
                Swal.fire('Error', 'No se pudo subir el archivo.', 'error');
            }
        });
    }

    remove(file: any): void {
        Swal.fire({
            title: '¿Eliminar archivo?',
            text: `Se eliminará permanentemente "${file.nombreArchivo}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._taskService
                    .removeFile(this.tareaId, file.categoria, file.nombreArchivo)
                    .subscribe({
                        next: () => {
                            this.loadFiles();
                            Swal.fire({
                                icon: 'success',
                                title: 'Eliminado',
                                text: 'El archivo ha sido eliminado.',
                                timer: 1500,
                                showConfirmButton: false,
                                position: 'top-end',
                                toast: true
                            });
                        },
                        error: (err) => {
                            console.error('Error al eliminar el archivo:', err);
                            Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error');
                        }
                    });
            }
        });
    }

    download(file: any): void {
        this._taskService
            .downloadFile(this.tareaId, file.categoria, file.nombreArchivo)
            .subscribe({
                next: (resp) => {
                    if (resp && resp.data) {
                        // Convertir Base64 a Blob
                        const byteCharacters = atob(resp.data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray]);

                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = file.nombreArchivo;
                        a.click();
                        window.URL.revokeObjectURL(url);
                    } else {
                        alert('No se recibió contenido para el archivo.');
                    }
                },
                error: (err) => {
                    console.error('Error al descargar el archivo:', err);
                    Swal.fire('Error', 'No se pudo descargar el archivo. Verifica la configuración del backend.', 'error');
                }
            });
    }

    // Helper to get image URL for preview using the backend download endpoint
    getFileUrl(file: any): string {
        if (!file || !this.tareaId) return '';
        // Construct the URL with query parameters
        return `${this._taskService.apiUrl}/DescargarArchivoTarea?tareaId=${this.tareaId}&categoria=${encodeURIComponent(file.categoria)}&nombreArchivo=${encodeURIComponent(file.nombreArchivo)}`;
    }

    getFileIcon(filename: string): string {
        if (!filename) return 'heroicons_outline:document';
        const extension = filename.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'svg':
                return 'heroicons_outline:photo';
            case 'pdf':
                return 'heroicons_outline:document-text';
            case 'xls':
            case 'xlsx':
            case 'csv':
                return 'heroicons_outline:table-cells';
            case 'doc':
            case 'docx':
            case 'txt':
                return 'heroicons_outline:document-text';
            case 'ppt':
            case 'pptx':
                return 'heroicons_outline:presentation-chart-bar';
            case 'mp4':
            case 'mov':
            case 'avi':
                return 'heroicons_outline:video-camera';
            case 'zip':
            case 'rar':
                return 'heroicons_outline:archive-box';
            default:
                return 'heroicons_outline:document';
        }
    }

    getIconColor(filename: string): string {
        if (!filename) return 'text-gray-400';
        const extension = filename.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'png':
            case 'jpg':
            case 'jpeg':
                return 'text-blue-500';
            case 'pdf':
                return 'text-red-500';
            case 'xls':
            case 'xlsx':
            case 'csv':
                return 'text-green-500';
            case 'doc':
            case 'docx':
                return 'text-blue-600';
            case 'ppt':
            case 'pptx':
                return 'text-orange-500';
            case 'mp4':
            case 'mov':
            case 'avi':
                return 'text-purple-500';
            case 'txt':
                return 'text-gray-600';
            case 'zip':
            case 'rar':
                return 'text-amber-500';
            default:
                return 'text-gray-400';
        }
    }

    close(): void {
        this.dialogRef.close();
    }
}
