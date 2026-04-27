import { Component, Inject, OnInit, ViewEncapsulation, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CierreTerminalService } from '../cierre-terminal.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { CierreTerminal, CierreTerminalResponse } from '../cierre-terminal.types';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';
import { UserService } from 'app/core/user/user.service';
import { Subject, take, takeUntil } from 'rxjs';

@Component({
    selector: 'cierre-terminal-form-dialog',
    templateUrl: './cierre-terminal-form.component.html',
    styleUrls: ['./cierre-terminal-form.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDatepickerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatChipsModule,
        MatDividerModule,
        MatNativeDateModule,
        MatTooltipModule,
        ImagePreviewDialogComponent
    ]
})
export class CierreTerminalFormDialogComponent implements OnInit, OnDestroy {
    form: FormGroup;
    isLoading: boolean = false;
    isEdit: boolean = false;
    
    // Chips configuration
    readonly separatorKeysCodes = [ENTER, COMMA] as const;
    foliosList: string[] = [];

    // File upload
    selectedFiles: File[] = [];
    existingFiles: string[] = [];

    unidadesNegocio: any[] = [];
    
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        public matDialogRef: MatDialogRef<CierreTerminalFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { id?: number },
        private _fb: FormBuilder,
        private _cierreService: CierreTerminalService,
        private _notificationService: ChatNotificationService,
        private _userService: UserService,
        private _dialog: MatDialog,
        private _cdr: ChangeDetectorRef
    ) {
        this.form = this._fb.group({
            unidadDeNegocioId: [null, Validators.required],
            fechaCierre: [new Date(), Validators.required],
            afiliacion: ['', Validators.required],
            montoTotal: [null, [Validators.required, Validators.min(0)]],
            observaciones: ['']
        });
    }

    ngOnInit(): void {
        this.getUnidadesNegocio();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    getUnidadesNegocio(): void {
        this._cierreService.getUnidadesNegocio().subscribe({
            next: (data) => {
                this.unidadesNegocio = data;
                if (this.data?.id) {
                    this.isEdit = true;
                    this.loadCierre(this.data.id);
                }
            },
            error: () => {
                this._notificationService.showError('Error', 'No se pudieron cargar las unidades de negocio.');
            }
        });
    }

    loadCierre(id: number): void {
        this.isLoading = true;
        this._cierreService.getById(id).subscribe({
            next: (response) => {
                const cierre = response.detalle.datosCierre;
                const rawCierre = cierre as any;
                let unidadId = Number(
                    cierre.unidadDeNegocioId || 
                    rawCierre.unidadNegocioId || 
                    rawCierre.unidadId || 
                    rawCierre.unidadDeNegocio ||
                    rawCierre.sucursalId
                ) || null;

                // Si no hay ID numérico, buscar por nombre
                if (!unidadId && cierre.sucursal) {
                    const found = this.unidadesNegocio.find(u => 
                        (u.nombre || u.Nombre || '').toLowerCase().trim() === cierre.sucursal.toLowerCase().trim()
                    );
                    if (found) {
                        unidadId = found.unidadId || found.UnidadId;
                    }
                }

                this.form.patchValue({
                    unidadDeNegocioId: unidadId,
                    fechaCierre: new Date(cierre.fechaCierre),
                    afiliacion: cierre.afiliacion,
                    montoTotal: cierre.montoTotal,
                    observaciones: cierre.observaciones
                });
                
                if (cierre.foliosFacturas) {
                    this.foliosList = cierre.foliosFacturas.split(',').filter(f => !!f.trim());
                }
                
                this.existingFiles = response.evidencias || [];
                
                this.isLoading = false;
                this._cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this._notificationService.showError('Error', 'No se pudo cargar la información del cierre.');
                this.matDialogRef.close();
            }
        });
    }

    // Chips logic
    addFolio(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();
        if (value) {
            this.foliosList.push(value);
        }
        event.chipInput!.clear();
    }

    removeFolio(folio: string): void {
        const index = this.foliosList.indexOf(folio);
        if (index >= 0) {
            this.foliosList.splice(index, 1);
        }
    }

    // File upload logic
    onFilesSelected(event: any): void {
        const files: FileList = event.target.files;
        if (files) {
            for (let i = 0; i < files.length; i++) {
                this.selectedFiles.push(files[i]);
            }
        }
    }

    removeFile(index: number): void {
        this.selectedFiles.splice(index, 1);
    }

    onFileDrop(event: DragEvent): void {
        event.preventDefault();
        const files = event.dataTransfer?.files;
        if (files) {
            for (let i = 0; i < files.length; i++) {
                this.selectedFiles.push(files[i]);
            }
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    descargar(nombreArchivo: string): void {
        if (!this.data?.id) return;
        
        this._cierreService.descargarEvidencia(this.data.id, nombreArchivo)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
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
                        a.download = nombreArchivo;
                        a.click();
                        URL.revokeObjectURL(objectUrl);
                    } else {
                        this._notificationService.showError('Error', 'Archivo no encontrado o vacío.');
                    }
                },
                error: () => {
                    this._notificationService.showError('Error', 'No se pudo descargar el archivo.');
                }
            });
    }

    verEvidencia(nombreArchivo: string): void {
        if (!this.data?.id) return;
        
        const extension = nombreArchivo.split('.').pop()?.toLowerCase() || '';
        
        this._cierreService.descargarEvidencia(this.data.id, nombreArchivo)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => {
                    if (res && res.data) {
                        const isPdf = extension === 'pdf';
                        let fileData: any;

                        if (isPdf) {
                            const binaryString = window.atob(res.data);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            fileData = bytes;
                        } else {
                            fileData = `data:image/${extension};base64,${res.data}`;
                        }

                        this._dialog.open(ImagePreviewDialogComponent, {
                            data: {
                                url: fileData,
                                name: nombreArchivo,
                                isPdf: isPdf
                            },
                            panelClass: 'bg-transparent',
                            maxWidth: isPdf ? '95vw' : '90vw',
                            width: isPdf ? '1200px' : 'auto',
                            backdropClass: ['bg-black', 'bg-opacity-80']
                        });
                    } else {
                        this._notificationService.showError('Error', 'Archivo no encontrado o vacío.');
                    }
                },
                error: () => {
                    this._notificationService.showError('Error', 'No se pudo cargar el archivo.');
                }
            });
    }

    submit(): void {
        if (this.form.invalid) {
            this._notificationService.showWarning('Formulario Incompleto', 'Por favor revisa los campos marcados en rojo.');
            return;
        }

        if (this.foliosList.length === 0) {
            this._notificationService.showWarning('Atención', 'Debes agregar al menos un folio.');
            return;
        }

        const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
        const usuarioId = userInformation.usuario?.id || 0;

        const selectedUnit = this.unidadesNegocio.find(u => Number(u.unidadId || u.UnidadId) === Number(this.form.value.unidadDeNegocioId));

        const cierre: CierreTerminal = {
            ...this.form.value,
            unidadDeNegocioId: Number(this.form.value.unidadDeNegocioId),
            sucursal: selectedUnit?.nombre || selectedUnit?.Nombre || '',
            foliosFacturas: this.foliosList.join(','),
            usuarioId: usuarioId
        };
        
        // Add variations just in case the backend expects them
        (cierre as any).unidadId = Number(this.form.value.unidadDeNegocioId);
        (cierre as any).unidadNegocioId = Number(this.form.value.unidadDeNegocioId);

        this.isLoading = true;

        if (this.isEdit) {
            this._cierreService.update(this.data.id!, cierre).subscribe({
                next: () => {
                    if (this.selectedFiles.length > 0) {
                        this._cierreService.subirEvidencias(this.data.id!, this.selectedFiles).subscribe({
                            next: () => {
                                this.handleSuccess('Cierre y nuevas evidencias guardados correctamente.');
                            },
                            error: () => {
                                this.handleSuccess('Cierre actualizado, pero hubo un problema al subir las nuevas evidencias.');
                            }
                        });
                    } else {
                        this.handleSuccess('Cierre actualizado correctamente.');
                    }
                },
                error: () => {
                    this.isLoading = false;
                    this._notificationService.showError('Error', 'No se pudo actualizar el registro.');
                }
            });
        } else {
            this._cierreService.create(cierre).subscribe({
                next: (idGenerated: any) => {
                    const finalId = idGenerated?.id || idGenerated;
                    if (this.selectedFiles.length > 0) {
                        this._cierreService.subirEvidencias(finalId, this.selectedFiles).subscribe({
                            next: () => {
                                this.handleSuccess('Cierre y evidencias guardados correctamente.');
                            },
                            error: () => {
                                this.handleSuccess('Cierre guardado, pero hubo un problema al subir las evidencias.');
                            }
                        });
                    } else {
                        this.handleSuccess('Cierre guardado correctamente.');
                    }
                },
                error: () => {
                    this.isLoading = false;
                    this._notificationService.showError('Error', 'No se pudo crear el registro.');
                }
            });
        }
    }

    handleSuccess(msg: string): void {
        this.isLoading = false;
        this._notificationService.showSuccess('Éxito', msg);
        this.matDialogRef.close(true);
    }

    close(): void {
        this.matDialogRef.close();
    }
}
