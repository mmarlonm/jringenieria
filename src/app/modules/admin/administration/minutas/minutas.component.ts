import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import { OnlyOfficeEditorComponent } from '@fuse/components/only-office-editor/only-office-editor.component';
import { environment } from 'environments/environment';
import { MinutasService } from './minutas.service';
import { Minuta, MinutaCatalogos } from './minutas.types';
import { MinutaDialogComponent } from './minuta-dialog.component';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-minutas',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatTableModule,
        MatDialogModule,
        MatSnackBarModule
    ],
    templateUrl: './minutas.component.html',
    styleUrls: ['./minutas.component.scss']
})
export class MinutasComponent implements OnInit {
    private readonly _minutasService = inject(MinutasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _cdr = inject(ChangeDetectorRef);

    onlyOfficeDocsUrl: string = environment.apiOnlyOffice;

    minutas: Minuta[] = [];
    catalogos: MinutaCatalogos = { sucursales: [], usuarios: [] };

    filtroSucursal = new FormControl<number>(0);
    filtroBuscar = new FormControl<string>('');
    filtroVisibilidad = new FormControl<string>('');

    cargando = false;
    columnasVisibles = ['folio', 'sucursal', 'fecha', 'titulo', 'archivo', 'visibilidad', 'autor', 'acciones'];

    ngOnInit(): void {
        this.cargarCatalogos();
        this.cargarMinutas();

        this.filtroSucursal.valueChanges.subscribe(() => this.cargarMinutas());
        this.filtroVisibilidad.valueChanges.subscribe(() => this.cargarMinutas());

        this.filtroBuscar.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe(() => {
                this.cargarMinutas();
            });
    }

    cargarCatalogos(): void {
        this._minutasService.obtenerCatalogos().subscribe({
            next: (cat) => {
                this.catalogos = cat;
                this._cdr.markForCheck();
            },
            error: (err) => console.error('Error al cargar catálogos de minutas:', err)
        });
    }

    obtenerNombreSucursalFiltro(id: number | null): string {
        if (!id || id === 0) return 'Todas las sucursales';
        const s = this.catalogos.sucursales.find(suc => suc.sucursalId === id);
        return s ? s.nombre : 'Todas las sucursales';
    }

    cargarMinutas(): void {
        this.cargando = true;
        const sucursalId = this.filtroSucursal.value && this.filtroSucursal.value > 0 ? this.filtroSucursal.value : null;
        const buscar = this.filtroBuscar.value || '';

        this._minutasService.listar(sucursalId, buscar).subscribe({
            next: (data) => {
                const vis = this.filtroVisibilidad.value;
                if (vis === 'PUBLICA') {
                    this.minutas = data.filter(m => m.esPublica);
                } else if (vis === 'RESTRINGIDA') {
                    this.minutas = data.filter(m => !m.esPublica);
                } else {
                    this.minutas = data;
                }
                this.cargando = false;
                this._cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error al listar minutas:', err);
                this.cargando = false;
                this._snackBar.open('Error al cargar minutas de reunión.', 'Cerrar', { duration: 3000 });
                this._cdr.markForCheck();
            }
        });
    }

    filtrarPorPalabraClave(tag: string): void {
        this.filtroBuscar.setValue(tag);
    }

    abrirDialogoCrear(): void {
        const ref = this._dialog.open(MinutaDialogComponent, {
            width: '95vw',
            maxWidth: '650px',
            data: {
                catalogos: this.catalogos
            },
            disableClose: true
        });

        ref.afterClosed().subscribe((guardado) => {
            if (guardado) this.cargarMinutas();
        });
    }

    abrirDialogoEditar(minuta: Minuta): void {
        const ref = this._dialog.open(MinutaDialogComponent, {
            width: '95vw',
            maxWidth: '650px',
            data: {
                minuta: minuta,
                catalogos: this.catalogos
            },
            disableClose: true
        });

        ref.afterClosed().subscribe((guardado) => {
            if (guardado) this.cargarMinutas();
        });
    }

    previsualizar(minuta: Minuta): void {
        const ext = (minuta.archivoExtension || '').toLowerCase().replace('.', '');
        const fileName = minuta.archivoNombreOriginal;

        if (this.esDocumentoOffice(ext)) {
            this.abrirOnlyOffice(minuta);
            return;
        }

        this._snackBar.open(`Cargando vista previa de ${fileName}...`, '', { duration: 1500 });

        this._minutasService.preview(minuta.minutaId).subscribe({
            next: (res) => {
                if (res && res.data) {
                    const byteCharacters = atob(res.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const isPdf = res.isPdf || ext === 'pdf';
                    const contentType = res.contentType || (isPdf ? 'application/pdf' : 'image/png');
                    const blob = new Blob([byteArray], { type: contentType });
                    const fileURL = URL.createObjectURL(blob);

                    this._dialog.open(ImagePreviewDialogComponent, {
                        data: {
                            url: fileURL,
                            name: (minuta.folio ? `${minuta.folio}: ` : '') + fileName,
                            isPdf: isPdf
                        }
                    });
                }
            },
            error: (err) => {
                console.error('Error al previsualizar minuta:', err);
                Swal.fire('Error', 'No se pudo generar la vista previa del archivo.', 'error');
            }
        });
    }

    abrirOnlyOffice(minuta: Minuta): void {
        const usuario = this.obtenerNombreUsuarioActual();
        this._snackBar.open(`Abriendo vista previa en OnlyOffice de ${minuta.archivoNombreOriginal}...`, '', { duration: 2000 });

        this._minutasService.getTokenOnlyOffice(minuta.minutaId, 'view', usuario).subscribe({
            next: (res) => {
                if (res && res.token) {
                    const editorConfig = res.config || {};
                    editorConfig.token = res.token;

                    this._dialog.open(OnlyOfficeEditorComponent, {
                        width: '95vw',
                        height: '92vh',
                        data: {
                            documentServerUrl: this.onlyOfficeDocsUrl,
                            editorConfig: editorConfig
                        }
                    });
                } else {
                    this.descargar(minuta);
                }
            },
            error: () => {
                Swal.fire({
                    title: 'Editor OnlyOffice no disponible',
                    text: '¿Deseas descargar el documento directamente para revisarlo en tu equipo?',
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, descargar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.descargar(minuta);
                    }
                });
            }
        });
    }

    descargar(minuta: Minuta): void {
        this._snackBar.open(`Descargando ${minuta.archivoNombreOriginal}...`, '', { duration: 2000 });

        this._minutasService.descargar(minuta.minutaId).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = minuta.archivoNombreOriginal;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            },
            error: (err) => {
                console.error('Error al descargar minuta:', err);
                Swal.fire('Error', 'No se pudo descargar el archivo de la minuta.', 'error');
            }
        });
    }

    eliminar(minuta: Minuta): void {
        Swal.fire({
            title: '¿Eliminar minuta?',
            text: `¿Estás seguro de eliminar la minuta "${minuta.titulo}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._minutasService.eliminar(minuta.minutaId).subscribe({
                    next: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Eliminada',
                            text: 'La minuta fue eliminada correctamente.',
                            timer: 1600,
                            showConfirmButton: false
                        });
                        this.cargarMinutas();
                    },
                    error: (err) => {
                        console.error('Error al eliminar minuta:', err);
                        Swal.fire('Error', err?.error?.mensaje || 'No se pudo eliminar la minuta.', 'error');
                    }
                });
            }
        });
    }

    esDocumentoOffice(ext: string): boolean {
        return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext.toLowerCase());
    }

    obtenerIconoArchivo(ext: string): string {
        const e = (ext || '').toLowerCase().replace('.', '');
        if (e === 'pdf') return 'heroicons_outline:document-text';
        if (['doc', 'docx'].includes(e)) return 'heroicons_outline:document';
        if (['xls', 'xlsx'].includes(e)) return 'heroicons_outline:table-cells';
        if (['ppt', 'pptx'].includes(e)) return 'heroicons_outline:presentation-chart-bar';
        if (['jpg', 'jpeg', 'png', 'webp'].includes(e)) return 'heroicons_outline:photo';
        return 'heroicons_outline:paper-clip';
    }

    formatearTamano(bytes?: number): string {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = 1;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    obtenerNombreUsuarioActual(): string {
        try {
            const raw = localStorage.getItem('userInformation');
            if (!raw) return 'Usuario';
            const storedData = JSON.parse(raw);
            const user = storedData.usuario || storedData;

            if (user && typeof user === 'object') {
                const partes = [user.nombre, user.apellidoPaterno, user.apellidoMaterno]
                    .filter((p: any) => typeof p === 'string' && p.trim().length > 0)
                    .map((p: string) => p.trim());
                if (partes.length > 0) {
                    return partes.join(' ');
                }
                return user.nombreUsuario || 'Usuario';
            }
            return 'Usuario';
        } catch {
            return 'Usuario';
        }
    }
}
