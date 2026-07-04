import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { EngineeringService, SeguimientoEjecucion } from '../../engineering.service';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-control-ejecucion-dialog',
    templateUrl: './control-ejecucion-dialog.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule,
        MatTabsModule
    ]
})
export class ControlEjecucionDialogComponent implements OnInit {
    form: FormGroup;
    ejecucion: SeguimientoEjecucion;

    recursosOptions = [
        'RECURSOS TOTALMENTE DISPONIBLES',
        'NO DISPONIBLE',
        'BAJA DISPONIBILIDAD',
        'CONFLICTO CON OTROS PROYECTOS'
    ];

    riesgoOptions = [
        'BAJO',
        'MEDIO',
        'ALTO',
        'MUY ALTO'
    ];

    prioridadOptions = [
        'IMPORTANTE URGENTE',
        'IMPORTANTE NO URGENTE',
        'NO IMPORTANTE URGENTE',
        'NO IMPORTANTE NO URGENTE'
    ];

    categories = [
        { name: 'AST', label: "AST's", icon: 'heroicons_outline:shield-check' },
        { name: 'Gantt', label: 'Prog. Gantt', icon: 'heroicons_outline:calendar-days' },
        { name: 'IMSS', label: 'IMSS/SUA', icon: 'heroicons_outline:identification' },
        { name: 'Materiales', label: 'Materiales', icon: 'heroicons_outline:square-3-stack-3d' },
        { name: 'Reportes', label: 'Reportes', icon: 'heroicons_outline:document-chart-bar' },
        { name: 'Contrato', label: 'Contrato', icon: 'heroicons_outline:document-text' },
        { name: 'Fianza', label: 'Fianza', icon: 'heroicons_outline:shield-check' },
        { name: 'Dossier', label: 'Dossier', icon: 'heroicons_outline:folder-open' },
        { name: 'ActaEntrega', label: 'Acta Entrega Final', icon: 'heroicons_outline:clipboard-document-check' },
        { name: 'Planos', label: 'Planos', icon: 'heroicons_outline:map' }
    ];

    archivos: { nombreArchivo: string, tipo: string }[] = [];
    isUploading: { [key: string]: boolean } = {};

    constructor(
        private _fb: FormBuilder,
        private _dialogRef: MatDialogRef<ControlEjecucionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { ejecucion: SeguimientoEjecucion },
        private _engineeringService: EngineeringService,
        private _dialog: MatDialog
    ) {
        this.ejecucion = data.ejecucion;
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            idEjecucion: [this.ejecucion?.idEjecucion || 0],
            idSeguimiento: [this.ejecucion.idSeguimiento],
            utilidadEsperada: [this.ejecucion?.utilidadEsperada || ''],
            disponibilidadRecursos: [this.ejecucion?.disponibilidadRecursos || ''],
            fechaInicioProyecto: [this.ejecucion?.fechaInicioProyecto ? new Date(this.ejecucion.fechaInicioProyecto) : ''],
            fechaFinProyecto: [this.ejecucion?.fechaFinProyecto ? new Date(this.ejecucion.fechaFinProyecto) : ''],
            riesgoTecnico: [this.ejecucion?.riesgoTecnico || ''],
            nivelPrioridad: [this.ejecucion?.nivelPrioridad || ''],
            contratoFolio: [this.ejecucion?.contratoFolio || ''],
            fianzaFolio: [this.ejecucion?.fianzaFolio || '']
        });
        this.loadFiles();
    }

    loadFiles(): void {
        if (!this.ejecucion.idSeguimiento) return;
        this._engineeringService.getArchivosEjecucion(this.ejecucion.idSeguimiento).subscribe({
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
        this._engineeringService.subirArchivoEjecucion(this.ejecucion.idSeguimiento, file, categoryName).subscribe({
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
        // Reset input
        event.target.value = '';
    }

    descargarArchivo(file: any): void {
        this._engineeringService.descargarArchivoEjecucion(this.ejecucion.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
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
        this._engineeringService.descargarArchivoEjecucion(this.ejecucion.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
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
                this._engineeringService.eliminarArchivoEjecucion(this.ejecucion.idSeguimiento, file.tipo, file.nombreArchivo).subscribe({
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

    save(): void {
        if (this.form.invalid) return;

        const val = this.form.value;
        this._dialogRef.close(val);
    }
}
