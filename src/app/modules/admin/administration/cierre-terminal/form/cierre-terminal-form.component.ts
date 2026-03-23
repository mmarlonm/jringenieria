import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule } from '@angular/material/core';
import { CierreTerminalService } from '../cierre-terminal.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { CierreTerminal, CierreTerminalResponse } from '../cierre-terminal.types';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { UserService } from 'app/core/user/user.service';
import { take } from 'rxjs';

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
        MatNativeDateModule
    ]
})
export class CierreTerminalFormDialogComponent implements OnInit {
    form: FormGroup;
    isLoading: boolean = false;
    isEdit: boolean = false;
    
    // Chips configuration
    readonly separatorKeysCodes = [ENTER, COMMA] as const;
    foliosList: string[] = [];

    // File upload
    selectedFiles: File[] = [];

    unidadesNegocio: any[] = [];

    constructor(
        public matDialogRef: MatDialogRef<CierreTerminalFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { id?: number },
        private _fb: FormBuilder,
        private _cierreService: CierreTerminalService,
        private _notificationService: ChatNotificationService,
        private _userService: UserService
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
        if (this.data?.id) {
            this.isEdit = true;
            this.loadCierre(this.data.id);
        }
    }

    getUnidadesNegocio(): void {
        this._cierreService.getUnidadesNegocio().subscribe({
            next: (data) => {
                this.unidadesNegocio = data;
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
                this.form.patchValue({
                    unidadDeNegocioId: cierre.unidadDeNegocioId,
                    fechaCierre: new Date(cierre.fechaCierre),
                    afiliacion: cierre.afiliacion,
                    montoTotal: cierre.montoTotal,
                    observaciones: cierre.observaciones
                });
                
                if (cierre.foliosFacturas) {
                    this.foliosList = cierre.foliosFacturas.split(',').filter(f => !!f.trim());
                }
                
                this.isLoading = false;
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

    submit(): void {
        if (this.form.invalid) {
            this._notificationService.showWarning('Formulario Incompleto', 'Por favor revisa los campos marcados en rojo.');
            return;
        }

        if (this.foliosList.length === 0) {
            this._notificationService.showWarning('Atención', 'Debes agregar al menos un folio.');
            return;
        }

        // Get current user from localStorage as it's the most direct way in this project's UserService style
        const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
        const usuarioId = userInformation.usuario?.id || 0;

        const selectedUnit = this.unidadesNegocio.find(u => u.unidadId === this.form.value.unidadDeNegocioId);

        const cierre: CierreTerminal = {
            ...this.form.value,
            sucursal: selectedUnit?.nombre || '',
            foliosFacturas: this.foliosList.join(','),
            usuarioId: usuarioId
        };

        this.isLoading = true;

        if (this.isEdit) {
            this._cierreService.update(this.data.id!, cierre).subscribe({
                next: () => {
                    this._notificationService.showSuccess('Éxito', 'Cierre actualizado correctamente.');
                    this.matDialogRef.close(true);
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
                                // A pesar de error en archivos, el registro se creó
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
