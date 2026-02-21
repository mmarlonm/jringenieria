import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransferManagementService } from '../transfer-management.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-gestionar-traspaso-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule
    ],
    templateUrl: './gestionar-traspaso-modal.component.html',
    styles: [`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    `]
})
export class GestionarTraspasoModalComponent implements OnInit {

    public loading: boolean = false;
    public subiendoArchivo: boolean = false;
    public traspaso: any;

    // Fase 3: Procesar Envío
    public datosEnvio = {
        transportista: '',
        guiaRastreo: '',
        urlEvidenciaEnvio: ''
    };

    // Fase 4: Aprobar Recepción
    public datosRecepcion = {
        conDiferencias: false,
        observaciones: '',
        urlEvidenciaRecepcion: '',
        idUsuarioRecibe: null
    };

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private _dialogRef: MatDialogRef<GestionarTraspasoModalComponent>,
        private _service: TransferManagementService
    ) {
        this.traspaso = data.traspaso;
    }

    ngOnInit(): void {
        // Inicializar datos si ya existen en el traspaso (ej. transportista por defecto)
        if (this.traspaso.estadoId === 1) {
            this.datosEnvio.transportista = this.traspaso.transportista || '';
            this.datosEnvio.guiaRastreo = this.traspaso.guiaRastreo || '';
        }

        // Obtener ID de usuario logueado para recepción
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            this.datosRecepcion.idUsuarioRecibe = userInformation.usuario?.id || 1;
        } catch (e) {
            this.datosRecepcion.idUsuarioRecibe = 1;
        }
    }

    get esEnvioInvalido(): boolean {
        return !this.datosEnvio.transportista || !this.datosEnvio.guiaRastreo || !this.datosEnvio.urlEvidenciaEnvio;
    }

    get esRecepcionInvalida(): boolean {
        if (this.datosRecepcion.conDiferencias && !this.datosRecepcion.observaciones.trim()) {
            return true;
        }
        return false;
    }

    onFileSelected(event: any, tipo: 'ENVIO' | 'RECEPCION'): void {
        const file: File = event.target.files[0];
        if (!file) return;

        this.subiendoArchivo = true;
        // Ajuste al controlador: tipoEvidencia debe ser "Envio" o "Recepcion"
        const tipoApi = tipo === 'ENVIO' ? 'Envio' : 'Recepcion';

        this._service.subirEvidencia(this.traspaso.idTraspaso, tipoApi, file).subscribe({
            next: (res) => {
                console.log('Respuesta de subida:', res);

                // El controlador puede devolver la ruta como un string directo en 'data' 
                // o como una propiedad 'path'/'url' dentro de 'data'
                let url = '';
                if (typeof res.data === 'string') {
                    url = res.data;
                } else {
                    url = res.data?.path || res.data?.url || res.path || res.url || '';
                }

                if (tipo === 'ENVIO') {
                    this.datosEnvio.urlEvidenciaEnvio = url;
                } else {
                    this.datosRecepcion.urlEvidenciaRecepcion = url;
                }


                if (!url) {
                    Swal.fire('Atención', 'El archivo se subió pero no se recibió la ruta del servidor.', 'warning');
                }

                this.subiendoArchivo = false;

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Archivo cargado correctamente',
                    showConfirmButton: false,
                    timer: 2000
                });
            },
            error: () => {
                this.subiendoArchivo = false;
                Swal.fire('Error', 'No se pudo subir el archivo', 'error');
            }
        });
    }


    confirmarEnvio(): void {
        this.loading = true;
        this._service.procesarEnvio(this.traspaso.idTraspaso, this.datosEnvio).subscribe({
            next: () => {
                this.loading = false;
                Swal.fire('Éxito', 'Envío procesado correctamente', 'success');
                this._dialogRef.close(true);
            },
            error: (err) => {
                this.loading = false;
                Swal.fire('Error', err.error?.message || 'No se pudo procesar el envío', 'error');
            }
        });
    }

    confirmarRecepcion(): void {
        this.loading = true;

        // Asegurar que el ID de usuario está actualizado antes de enviar
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            this.datosRecepcion.idUsuarioRecibe = userInformation.usuario?.id || 1;
        } catch (e) {
            console.error('Error al obtener usuario del localStorage', e);
        }

        console.log('Enviando aprobación de recepción:', this.datosRecepcion);

        this._service.aprobarRecepcion(this.traspaso.idTraspaso, this.datosRecepcion as any).subscribe({
            next: () => {
                this.loading = false;
                Swal.fire('Éxito', 'Recepción aprobada correctamente', 'success');
                this._dialogRef.close(true);
            },
            error: (err) => {
                this.loading = false;
                Swal.fire('Error', err.error?.message || 'No se pudo aprobar la recepción', 'error');
            }
        });
    }

}
