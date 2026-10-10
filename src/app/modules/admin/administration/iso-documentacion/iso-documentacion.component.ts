import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import { OnlyOfficeEditorComponent } from '@fuse/components/only-office-editor/only-office-editor.component';
import { environment } from 'environments/environment';
import { IsoDocumentacionService, IsoApartado, IsoSubcarpeta, IsoArchivo, IsoBitacoraItem } from './iso-documentacion.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-iso-documentacion',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatTooltipModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDialogModule
    ],
    templateUrl: './iso-documentacion.component.html',
    styleUrls: ['./iso-documentacion.component.scss']
})
export class IsoDocumentacionComponent implements OnInit {
    private _isoService = inject(IsoDocumentacionService);
    private _cdr = inject(ChangeDetectorRef);
    private _snackBar = inject(MatSnackBar);
    private _dialog = inject(MatDialog);

    onlyOfficeDocsUrl: string = environment.apiOnlyOffice;

    // Listas idénticas al modelo de Control de Ejecución (inicia en 0 apartados)
    apartados: IsoApartado[] = [];
    subcarpetas: IsoSubcarpeta[] = [];
    archivos: IsoArchivo[] = [];

    // Control de navegación y estados idénticos a Control de Ejecución
    activeSubcarpetas: { [key: string]: string } = {};
    isDragOver: { [key: string]: boolean } = {};
    isUploading: { [key: string]: boolean } = {};

    // Barra de carga determinista y métricas en tiempo real (+100 archivos / ZIP)
    uploadProgress: { [key: string]: number } = {};
    uploadStats: { [key: string]: { totalArchivos: number; loadedBytes: number; totalBytes: number } } = {};

    // Optimizaciones de rendimiento: Índices en memoria y paginación rápida por tarjeta
    cachedSubcarpetas: { [key: string]: string[] } = {};
    cachedFiles: { [key: string]: any[] } = {};
    searchQuery: { [key: string]: string } = {};
    paginas: { [key: string]: number } = {};
    pageSize = 12;

    isLoading = false;
    mostrarBitacora = false;
    bitacoraItems: IsoBitacoraItem[] = [];
    isLoadingBitacora = false;

    permisos = {
        ver: true,
        subir: true,
        agregarCarpetas: true,
        descargar: true,
        eliminar: true
    };

    ngOnInit(): void {
        this.cargarPermisosUsuario();
        this.loadFiles();
    }

    obtenerUsuarioActual(): string {
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
                const posible = user.nombreCompleto || user.fullName || user.displayName || user.nombreUsuario || user.userName || user.email;
                if (typeof posible === 'string' && posible.trim().length > 0) {
                    return posible.trim();
                }
            }

            if (typeof storedData.nombre === 'string' && storedData.nombre.trim()) return storedData.nombre.trim();
            if (typeof storedData.email === 'string' && storedData.email.trim()) return storedData.email.trim();
            if (typeof storedData.userName === 'string' && storedData.userName.trim()) return storedData.userName.trim();

            return 'Usuario';
        } catch {
            return 'Usuario';
        }
    }

    formatearUsuario(usuario: any): string {
        if (!usuario || typeof usuario !== 'string' || usuario.includes('[object Object]') || usuario.trim() === '') {
            return this.obtenerUsuarioActual();
        }
        return usuario;
    }

    cargarPermisosUsuario(): void {
        try {
            const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const userPermisosList = storedData.permisos || [];
            const userVistasList = storedData.vistas || [];
            const pIds = new Set<number>();
            let tieneVistaConfigurada = false;

            // 1. Filtrar de lista plana de permisos (estructura estándar en C# API)
            userPermisosList.forEach((p: any) => {
                const vistaName = p.vista?.nombreVista || p.vista?.vistaId || p.nombreVista || p.vistaId || '';
                if (vistaName === 'administracion.iso-documentacion' || vistaName === 'administracion.iso9001') {
                    tieneVistaConfigurada = true;
                    const id = Number(p.permisoId || p.idPermiso || p.id);
                    if (!isNaN(id) && id > 0) pIds.add(id);

                    const subList = p.acciones || p.permisos || p.subPermisos || [];
                    subList.forEach((sub: any) => {
                        const subId = Number(sub.permisoId || sub.idPermiso || sub.id || sub);
                        if (!isNaN(subId) && subId > 0) pIds.add(subId);
                    });
                }
            });

            // 2. Filtrar de lista de vistas si existen
            userVistasList.forEach((v: any) => {
                const vistaName = v.nombreVista || v.vistaId || v.idVista || '';
                if (vistaName === 'administracion.iso-documentacion' || vistaName === 'administracion.iso9001') {
                    tieneVistaConfigurada = true;
                    const vPermisos = v.permisos || [];
                    vPermisos.forEach((vp: any) => {
                        const vpId = Number(typeof vp === 'number' ? vp : (vp.permisoId || vp.idPermiso || vp.id));
                        if (!isNaN(vpId) && vpId > 0) pIds.add(vpId);
                    });
                }
            });

            // Si el rol tiene la vista configurada (se guardaron permisos para esta pantalla):
            // RESPETAR ESTRICTAMENTE LAS CASILLAS (1002=Agregar, 2=Agregar Carpetas, 1003=Descargar, 3=Eliminar, 1=Ver):
            if (tieneVistaConfigurada || pIds.size > 0) {
                this.permisos = {
                    ver: pIds.has(1) || pIds.has(1002) || pIds.has(2) || pIds.has(3) || pIds.has(1003) || pIds.size > 0,
                    subir: pIds.has(1002), // 1002 = Agregar (subir archivos)
                    agregarCarpetas: pIds.has(2), // 2 = Agregar Carpetas (crear apartados y subcarpetas)
                    descargar: pIds.has(1003) || pIds.has(7), // 1003 = Descargar
                    eliminar: pIds.has(3) || pIds.has(4) // 3 = Eliminar
                };
                return;
            }

            // Si la vista aún no está configurada para el rol pero es Admin:
            const roles: string[] = storedData.roles || [];
            if (roles.some((r) => r && ['admin', 'administrador', 'pruebas', 'superadmin'].includes(r.toLowerCase()))) {
                this.permisos = { ver: true, subir: true, agregarCarpetas: true, descargar: true, eliminar: true };
                return;
            }

            // Por defecto restrictivo si no tiene permisos
            this.permisos = { ver: true, subir: false, agregarCarpetas: false, descargar: false, eliminar: false };
        } catch (e) {
            console.error('Error procesando permisos de usuario ISO:', e);
        }
    }

    loadFiles(): void {
        this.isLoading = true;
        this._isoService.obtenerArchivos().subscribe({
            next: (res) => {
                this.apartados = res?.apartados || [];
                this.subcarpetas = res?.subcarpetas || [];
                this.archivos = res?.archivos || [];
                this.reindexarArchivos();
                this.isLoading = false;
                this._cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error al cargar archivos ISO:', err);
                this.isLoading = false;
                this._snackBar.open('Error al cargar la documentación ISO.', 'Cerrar', { duration: 4000 });
                this._cdr.markForCheck();
            }
        });
    }

    // =========================================================================
    // OPTIMIZACIÓN DE RENDIMIENTO: ÍNDICES EN MEMORIA (O(1)) Y PAGINACIÓN
    // =========================================================================

    reindexarArchivos(): void {
        this.cachedSubcarpetas = {};
        this.cachedFiles = {};

        for (const cat of this.apartados) {
            // Indexar subcarpetas (tanto de carpetas en disco vacías como de archivos)
            const subSet = new Set<string>();
            const activeSub = this.activeSubcarpetas[cat.nombre];

            // 1. De la lista de subcarpetas creadas físicamente en disco (incluso vacías)
            if (this.subcarpetas && this.subcarpetas.length > 0) {
                for (const s of this.subcarpetas) {
                    if (s.tipo === cat.nombre && s.nombreSubcarpeta) {
                        if (activeSub) {
                            if (s.nombreSubcarpeta.startsWith(activeSub + '/')) {
                                const rest = s.nombreSubcarpeta.substring(activeSub.length + 1);
                                const firstLevel = rest.split('/')[0];
                                if (firstLevel) subSet.add(firstLevel);
                            }
                        } else {
                            const firstLevel = s.nombreSubcarpeta.split('/')[0];
                            if (firstLevel) subSet.add(firstLevel);
                        }
                    }
                }
            }

            // 2. De la lista de archivos (para carpetas con archivos)
            for (const a of this.archivos) {
                if (a.tipo === cat.nombre && a.nombreArchivo && a.nombreArchivo.includes('/')) {
                    if (activeSub) {
                        if (a.nombreArchivo.startsWith(activeSub + '/')) {
                            const rest = a.nombreArchivo.substring(activeSub.length + 1);
                            if (rest.includes('/')) {
                                const firstLevel = rest.split('/')[0];
                                if (firstLevel) subSet.add(firstLevel);
                            }
                        }
                    } else {
                        const parts = a.nombreArchivo.split('/');
                        if (parts.length > 1 && parts[0]) {
                            subSet.add(parts[0]);
                        }
                    }
                }
            }
            this.cachedSubcarpetas[cat.nombre] = Array.from(subSet).sort();

            // Indexar archivos según subcarpeta activa y filtro rápido
            const query = (this.searchQuery[cat.nombre] || '').trim().toLowerCase();

            const allFiles = this.archivos.filter((a) => {
                if (a.tipo !== cat.nombre) return false;
                let inPath = false;
                if (activeSub) {
                    inPath = !!(a.nombreArchivo && a.nombreArchivo.startsWith(activeSub + '/'));
                } else {
                    inPath = !!(a.nombreArchivo && !a.nombreArchivo.includes('/'));
                }
                if (!inPath) return false;
                if (query) {
                    const nombreSolo = this.getFileDisplayName(a, cat.nombre).toLowerCase();
                    return nombreSolo.includes(query);
                }
                return true;
            });

            this.cachedFiles[cat.nombre] = allFiles;
            if (!this.paginas[cat.nombre]) {
                this.paginas[cat.nombre] = 1;
            }
        }
    }

    getSubcarpetasByCategory(categoryName: string): string[] {
        return this.cachedSubcarpetas[categoryName] || [];
    }

    getFilesByCategory(categoryName: string): any[] {
        return this.cachedFiles[categoryName] || [];
    }

    getPaginatedFiles(categoryName: string): any[] {
        const all = this.cachedFiles[categoryName] || [];
        const page = this.paginas[categoryName] || 1;
        const start = (page - 1) * this.pageSize;
        return all.slice(start, start + this.pageSize);
    }

    getTotalPaginas(categoryName: string): number {
        const total = (this.cachedFiles[categoryName] || []).length;
        return Math.ceil(total / this.pageSize) || 1;
    }

    cambiarPagina(categoryName: string, delta: number): void {
        const current = this.paginas[categoryName] || 1;
        const max = this.getTotalPaginas(categoryName);
        const next = current + delta;
        if (next >= 1 && next <= max) {
            this.paginas[categoryName] = next;
            this._cdr.markForCheck();
        }
    }

    onSearchChanged(categoryName: string): void {
        this.paginas[categoryName] = 1;
        this.reindexarArchivos();
        this._cdr.markForCheck();
    }

    getFileDisplayName(file: any, categoryName: string): string {
        if (!file || !file.nombreArchivo) return '';
        const activeSub = this.activeSubcarpetas[categoryName];
        if (activeSub && file.nombreArchivo.startsWith(activeSub + '/')) {
            return file.nombreArchivo.substring(activeSub.length + 1);
        }
        return file.nombreArchivo;
    }

    trackByFileName(index: number, file: any): string {
        return file ? (file.tipo || '') + '_' + (file.nombreArchivo || index) : index.toString();
    }

    trackBySubcarpeta(index: number, folder: string): string {
        return folder;
    }

    trackByApartado(index: number, cat: any): string {
        return cat ? (cat.nombre || index) : index.toString();
    }

    crearApartado(): void {
        if (!this.permisos.agregarCarpetas) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para crear apartados o carpetas.'
            });
            return;
        }

        Swal.fire({
            title: 'Nuevo Apartado ISO 9001',
            input: 'text',
            inputPlaceholder: 'Ej. 04. Contexto, Manual de Calidad, Auditorías',
            showCancelButton: true,
            confirmButtonText: 'Crear Apartado',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'El nombre del apartado no puede estar vacío';
                }
                if (value.includes('/') || value.includes('\\')) {
                    return 'El nombre no puede contener barras diagonales (/) o (\\)';
                }
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const nombreApartado = result.value.trim();
                const usuario = this.obtenerUsuarioActual();

                this._isoService.crearApartado(nombreApartado, usuario).subscribe({
                    next: () => {
                        this.loadFiles();
                        this._snackBar.open(`Apartado "${nombreApartado}" creado exitosamente.`, 'OK', { duration: 3000 });
                    },
                    error: (err) => {
                        console.error('Error al crear apartado:', err);
                        this._snackBar.open('Error al crear el apartado.', 'Cerrar', { duration: 4000 });
                    }
                });
            }
        });
    }

    eliminarApartado(categoryName: string): void {
        if (!this.permisos.eliminar) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para eliminar apartados.'
            });
            return;
        }

        const usuario = this.obtenerUsuarioActual();

        Swal.fire({
            title: '¿Eliminar apartado completo?',
            text: `Se eliminará el apartado "${categoryName}" y todos los archivos y subcarpetas que contiene.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._isoService.eliminar(categoryName, undefined, undefined, usuario).subscribe({
                    next: () => {
                        delete this.activeSubcarpetas[categoryName];
                        this.loadFiles();
                        this._snackBar.open(`Apartado "${categoryName}" eliminado.`, 'OK', { duration: 3000 });
                    },
                    error: (err) => {
                        console.error('Error al eliminar apartado:', err);
                        this._snackBar.open('Error al eliminar el apartado.', 'Cerrar', { duration: 4000 });
                    }
                });
            }
        });
    }

    crearSubcarpeta(categoryName: string): void {
        if (!this.permisos.agregarCarpetas) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para crear subcarpetas.'
            });
            return;
        }
        Swal.fire({
            title: 'Crear nueva subcarpeta',
            input: 'text',
            inputPlaceholder: 'Nombre de la carpeta',
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'El nombre de la carpeta no puede estar vacío';
                }
                if (value.includes('/') || value.includes('\\')) {
                    return 'El nombre no puede contener barras diagonales (/) o (\\)';
                }
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const folderName = result.value.trim();
                const usuario = this.obtenerUsuarioActual();

                const activeSub = this.activeSubcarpetas[categoryName];
                const fullFolderPath = activeSub ? `${activeSub}/${folderName}` : folderName;

                this._isoService.crearSubcarpeta(categoryName, fullFolderPath, usuario).subscribe({
                    next: () => {
                        this.activeSubcarpetas[categoryName] = fullFolderPath;
                        this.loadFiles();
                        this._snackBar.open(`Subcarpeta "${folderName}" creada exitosamente.`, 'OK', { duration: 3000 });
                        this._cdr.markForCheck();
                    },
                    error: (err) => {
                        console.error('Error al crear subcarpeta:', err);
                        this._snackBar.open('Error al crear la subcarpeta.', 'Cerrar', { duration: 4000 });
                    }
                });
            }
        });
    }

    navegarSubcarpeta(categoryName: string, subcarpeta: string | null): void {
        if (subcarpeta) {
            const current = this.activeSubcarpetas[categoryName];
            if (current && !subcarpeta.startsWith(current)) {
                this.activeSubcarpetas[categoryName] = `${current}/${subcarpeta}`;
            } else {
                this.activeSubcarpetas[categoryName] = subcarpeta;
            }
        } else {
            delete this.activeSubcarpetas[categoryName];
        }
        this.paginas[categoryName] = 1;
        this.reindexarArchivos();
        this._cdr.markForCheck();
    }

    triggerFileInput(categoryName: string): void {
        if (!this.permisos.subir) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para subir archivos en este apartado.'
            });
            return;
        }
        const inputElement = document.getElementById('fileInput-' + categoryName) as HTMLInputElement;
        if (inputElement) {
            inputElement.click();
        }
    }

    onFileSelected(event: any, categoryName: string): void {
        const files: FileList = event.target.files;
        if (!files || files.length === 0) return;
        this.uploadFiles(Array.from(files), categoryName);
        event.target.value = '';
    }

    onDragOver(event: DragEvent, categoryName: string): void {
        event.preventDefault();
        event.stopPropagation();
        if (this.permisos.subir) {
            this.isDragOver[categoryName] = true;
        }
    }

    onDragLeave(event: DragEvent, categoryName: string): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver[categoryName] = false;
    }

    onFileDropped(event: DragEvent, categoryName: string): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver[categoryName] = false;

        if (!this.permisos.subir) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para subir archivos en este apartado.'
            });
            return;
        }

        if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            this.uploadFiles(Array.from(event.dataTransfer.files), categoryName);
        }
    }

    // Subida masiva con seguimiento determinista de eventos HTTP (+100 archivos o ZIP)
    uploadFiles(files: File[], categoryName: string): void {
        if (!this.permisos.subir) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para subir archivos.'
            });
            return;
        }
        const activeSub = this.activeSubcarpetas[categoryName] || '';
        const usuario = this.obtenerUsuarioActual();

        const formData = new FormData();
        formData.append('tipo', categoryName);
        formData.append('subcarpeta', activeSub);
        formData.append('usuario', usuario);

        let totalBytesSum = 0;
        files.forEach((file) => {
            totalBytesSum += file.size;
            formData.append('files', file, file.name);
        });

        this.isUploading[categoryName] = true;
        this.uploadProgress[categoryName] = 0;
        this.uploadStats[categoryName] = {
            totalArchivos: files.length,
            loadedBytes: 0,
            totalBytes: totalBytesSum
        };
        this._cdr.markForCheck();

        this._isoService.subirArchivosConProgreso(formData).subscribe({
            next: (event: any) => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                    const pct = Math.round((100 * event.loaded) / event.total);
                    this.uploadProgress[categoryName] = pct;
                    this.uploadStats[categoryName] = {
                        totalArchivos: files.length,
                        loadedBytes: event.loaded,
                        totalBytes: event.total
                    };
                    this._cdr.markForCheck();
                } else if (event.type === HttpEventType.Response) {
                    this.isUploading[categoryName] = false;
                    this.uploadProgress[categoryName] = 100;
                    this.loadFiles();
                    const total = event.body?.totalSubidos || files.length;
                    Swal.fire({
                        icon: 'success',
                        title: '¡Subida completada!',
                        text: `Se subieron ${total} archivo(s) exitosamente a ${categoryName}`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            },
            error: (err: any) => {
                this.isUploading[categoryName] = false;
                console.error('Error al subir archivos:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de subida',
                    text: 'Ocurrió un inconveniente al subir los archivos.'
                });
                this._cdr.markForCheck();
            }
        });
    }

    canPreview(file: any): boolean {
        if (!file || !file.nombreArchivo) return false;
        const ext = file.nombreArchivo.split('.').pop()?.toLowerCase() || '';
        // Archivos ZIP o comprimidos no se previsualizan
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
            return false;
        }
        return true;
    }

    isImageOrPdf(fileName: string): boolean {
        if (!fileName) return false;
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
    }

    isOfficeDocument(fileName: string): boolean {
        if (!fileName) return false;
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        return [
            'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'fodt', 'ott', 'rtf', 'txt',
            'xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm', 'ods', 'fods', 'ots', 'csv',
            'ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'ppsm', 'pot', 'potx', 'potm', 'odp', 'fodp', 'otp'
        ].includes(ext);
    }

    previsualizarArchivo(file: any): void {
        if (!this.permisos.ver) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para visualizar archivos.'
            });
            return;
        }

        if (!file || !file.tipo || !file.nombreArchivo) return;

        const fileName = file.nombreArchivo.split('/').pop() || file.nombreArchivo;
        const ext = (file.nombreArchivo.split('.').pop() || '').toLowerCase();

        // 1. Archivos comprimidos no se pueden previsualizar
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
            Swal.fire({
                icon: 'info',
                title: 'Archivo comprimido',
                text: 'Los archivos comprimidos (.zip) no se pueden previsualizar directamente. Puede descargarlo para revisar su contenido.',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        // 2. Documentos de Office -> OnlyOffice en modo 'view'
        if (this.isOfficeDocument(file.nombreArchivo)) {
            this.abrirOnlyOffice(file, 'view');
            return;
        }

        // 3. Imágenes o PDF -> Visor modal nativo
        const usuario = this.obtenerUsuarioActual();
        this._snackBar.open(`Cargando vista previa de ${fileName}...`, '', { duration: 1500 });

        this._isoService.descargarArchivo(file.tipo, file.nombreArchivo, usuario).subscribe({
            next: (res) => {
                if (res && res.data) {
                    const byteCharacters = atob(res.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const isPdf = ext === 'pdf';
                    const contentType = res.contentType || (isPdf ? 'application/pdf' : 'image/png');
                    const blob = new Blob([byteArray], { type: contentType });
                    const fileURL = URL.createObjectURL(blob);

                    this._dialog.open(ImagePreviewDialogComponent, {
                        data: {
                            url: fileURL,
                            name: fileName,
                            isPdf: isPdf
                        }
                    });
                }
            },
            error: (err) => {
                console.error('Error al previsualizar archivo:', err);
                Swal.fire('Error', 'No se pudo generar la vista previa del archivo.', 'error');
            }
        });
    }

    abrirOnlyOffice(file: any, mode: 'edit' | 'view' = 'edit'): void {
        const usuario = this.obtenerUsuarioActual();
        const accionLabel = mode === 'edit' ? 'Abriendo editor' : 'Abriendo vista previa';
        this._snackBar.open(`${accionLabel} de ${file.nombreArchivo}...`, '', { duration: 2000 });

        this._isoService.getToken(file.tipo, file.nombreArchivo, mode, usuario).subscribe({
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
                    Swal.fire('Error', 'No se pudo obtener el token para el editor de OnlyOffice.', 'error');
                }
            },
            error: (err) => {
                console.error('Error al conectar con OnlyOffice:', err);
                Swal.fire('Error', 'No se pudo iniciar el editor de OnlyOffice.', 'error');
            }
        });
    }

    editarArchivo(file: any): void {
        if (this.isOfficeDocument(file.nombreArchivo)) {
            this.abrirOnlyOffice(file, 'edit');
        } else {
            this.renombrarArchivoPrompt(file);
        }
    }

    renombrarArchivoPrompt(file: any): void {
        const displayName = file.nombreArchivo.split('/').pop() || file.nombreArchivo;
        const usuario = this.obtenerUsuarioActual();

        Swal.fire({
            title: 'Editar / Renombrar archivo',
            text: `Ingrese el nuevo nombre para "${displayName}":`,
            input: 'text',
            inputValue: displayName,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4f46e5',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'El nombre no puede estar vacío';
                }
                return null;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const nuevoNombre = result.value.trim();
                if (nuevoNombre === displayName) return;

                this._isoService.renombrar(file.tipo, file.nombreArchivo, nuevoNombre, usuario).subscribe({
                    next: () => {
                        this.loadFiles();
                        this._snackBar.open('Archivo renombrado exitosamente.', 'OK', { duration: 3000 });
                    },
                    error: (err) => {
                        console.error('Error al renombrar archivo:', err);
                        Swal.fire('Error', err?.error || 'No se pudo renombrar el archivo.', 'error');
                    }
                });
            }
        });
    }

    descargarArchivo(file: any): void {
        if (!this.permisos.descargar) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para descargar archivos.'
            });
            return;
        }

        const usuario = this.obtenerUsuarioActual();
        this._snackBar.open(`Descargando ${file.nombreArchivo}...`, '', { duration: 1500 });

        this._isoService.descargarArchivo(file.tipo, file.nombreArchivo, usuario).subscribe({
            next: (res) => {
                if (res && res.data) {
                    const byteCharacters = atob(res.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: res.contentType || 'application/octet-stream' });

                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = res.nombreArchivo || file.nombreArchivo.split('/').pop();
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }
            },
            error: (err) => {
                console.error('Error al descargar archivo:', err);
                this._snackBar.open('Error al descargar el archivo.', 'Cerrar', { duration: 4000 });
            }
        });
    }

    eliminarArchivo(file: any): void {
        if (!this.permisos.eliminar) {
            Swal.fire({
                icon: 'warning',
                title: 'Permiso denegado',
                text: 'No tienes permisos para eliminar archivos.'
            });
            return;
        }

        const usuario = this.obtenerUsuarioActual();
        const displayName = file.nombreArchivo.split('/').pop() || file.nombreArchivo;

        Swal.fire({
            title: '¿Eliminar archivo?',
            text: `Se eliminará permanentemente: "${displayName}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._isoService.eliminar(file.tipo, file.nombreArchivo, undefined, usuario).subscribe({
                    next: () => {
                        this.loadFiles();
                        this._snackBar.open('Archivo eliminado correctamente.', 'OK', { duration: 3000 });
                    },
                    error: (err) => {
                        console.error('Error al eliminar archivo:', err);
                        this._snackBar.open('Error al eliminar el archivo.', 'Cerrar', { duration: 4000 });
                    }
                });
            }
        });
    }

    eliminarSubcarpeta(categoryName: string, folderName: string): void {
        const usuario = this.obtenerUsuarioActual();
        const activeSub = this.activeSubcarpetas[categoryName];
        const fullSubPath = activeSub ? `${activeSub}/${folderName}` : folderName;

        Swal.fire({
            title: '¿Eliminar subcarpeta completa?',
            text: `Se eliminará la subcarpeta "${folderName}" y todos los archivos contenidos en ella.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._isoService.eliminar(categoryName, undefined, fullSubPath, usuario).subscribe({
                    next: () => {
                        if (this.activeSubcarpetas[categoryName] === fullSubPath) {
                            delete this.activeSubcarpetas[categoryName];
                        }
                        this.loadFiles();
                        this._snackBar.open(`Subcarpeta "${folderName}" eliminada.`, 'OK', { duration: 3000 });
                    },
                    error: (err) => {
                        console.error('Error al eliminar subcarpeta:', err);
                        this._snackBar.open('Error al eliminar la subcarpeta.', 'Cerrar', { duration: 4000 });
                    }
                });
            }
        });
    }

    abrirBitacora(): void {
        this.mostrarBitacora = true;
        this.cargarBitacora();
    }

    cerrarBitacora(): void {
        this.mostrarBitacora = false;
    }

    cargarBitacora(): void {
        this.isLoadingBitacora = true;
        this._isoService.obtenerBitacora(150).subscribe({
            next: (data) => {
                this.bitacoraItems = data || [];
                this.isLoadingBitacora = false;
                this._cdr.markForCheck();
            },
            error: (err) => {
                this.isLoadingBitacora = false;
                console.error('Error cargando bitácora:', err);
                this._snackBar.open('Error al obtener la bitácora de actividad.', 'Cerrar', { duration: 3000 });
                this._cdr.markForCheck();
            }
        });
    }

    getAccionBadge(accion: string): { label: string; class: string } {
        switch (accion) {
            case 'SUBIDA':
                return { label: 'Subida', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' };
            case 'DESCARGA':
                return { label: 'Descarga', class: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300' };
            case 'ELIMINACION':
                return { label: 'Eliminación', class: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300' };
            case 'CREACION_CARPETA':
                return { label: 'Nueva Carpeta', class: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300' };
            default:
                return { label: accion, class: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300' };
        }
    }

    formatSizeBytes(bytes: number): string {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}
