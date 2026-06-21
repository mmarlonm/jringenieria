import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { ProveedoresService } from '../../admin/administration/proveedores/proveedores.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-public-cuestionario-proveedor',
    templateUrl: './cuestionario-proveedor.component.html',
    styleUrls: ['./cuestionario-proveedor.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatRadioModule,
        MatTooltipModule
    ]
})
export class PublicCuestionarioProveedorComponent implements OnInit {
    idCuestionario: number = 0;
    cuestionario: any = null;
    loading: boolean = true;
    error: string | null = null;

    monedaCatalog = [{ valor: 'MXN' }, { valor: 'USD' }];
    tipoProveedorCatalog = [{ valor: 'Bienes' }, { valor: 'Servicios' }];
    categoriaCatalog = [{ valor: 'Material eléctrico' }, { valor: 'Servicios profesionales' }];

    archivosCargados: { [nombreDocumento: string]: string } = {};
    isUploadingDoc: { [nombreDocumento: string]: boolean } = {};

    constructor(
        private _route: ActivatedRoute,
        private _proveedoresService: ProveedoresService
    ) { }

    ngOnInit(): void {
        this.idCuestionario = Number(this._route.snapshot.paramMap.get('id'));
        if (!this.idCuestionario) {
            this.error = 'Enlace inválido o ID de cuestionario no especificado.';
            this.loading = false;
            return;
        }
        this.loadCuestionario();
    }

    loadCuestionario(): void {
        this.loading = true;
        this._proveedoresService.getCuestionarioPublico(this.idCuestionario).subscribe({
            next: (res) => {
                this.loading = false;
                if (res && res.success) {
                    this.cuestionario = res.data;
                    this.loadCuestionarioFiles();
                } else {
                    this.error = res.message || 'No se pudo cargar el cuestionario.';
                }
            },
            error: (err) => {
                this.loading = false;
                console.error(err);
                this.error = 'Ocurrió un error al obtener la información del cuestionario. Es posible que el enlace haya expirado o ya no sea válido.';
            }
        });
    }

    loadCuestionarioFiles(): void {
        this._proveedoresService.getArchivosCuestionario(this.idCuestionario).subscribe({
            next: (res) => {
                if (res && res.success) {
                    const list = res.data || [];
                    this.archivosCargados = {};
                    list.forEach((f: any) => {
                        this.archivosCargados[f.nombreDocumento] = f.nombreArchivo;
                    });
                }
            },
            error: (err) => console.error('Error al cargar archivos:', err)
        });
    }

    onFileSelected(event: any, nombreDocumento: string): void {
        if (this.cuestionario?.bloqueado) return;
        const file = event.target.files[0];
        if (!file) return;

        this.isUploadingDoc[nombreDocumento] = true;
        this._proveedoresService.subirArchivoCuestionario(this.idCuestionario, file, nombreDocumento).subscribe({
            next: (res) => {
                this.isUploadingDoc[nombreDocumento] = false;
                this.archivosCargados[nombreDocumento] = res.nombreArchivo;
                
                const doc = this.cuestionario.documentos.find((d: any) => d.nombreDocumento === nombreDocumento);
                if (doc) {
                    doc.estado = 'Entregado';
                    doc.fechaActualizacion = new Date();
                }

                Swal.fire({
                    title: '¡Subido!',
                    text: 'Archivo cargado con éxito.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            error: (err) => {
                this.isUploadingDoc[nombreDocumento] = false;
                console.error(err);
                Swal.fire('Error', 'No se pudo subir el archivo. Verifique que no supere el tamaño permitido.', 'error');
            }
        });
        event.target.value = '';
    }

    descargarDoc(nombreDocumento: string): void {
        this._proveedoresService.descargarArchivoCuestionario(this.idCuestionario, nombreDocumento).subscribe({
            next: (res) => {
                if (res && res.data) {
                    const byteCharacters = atob(res.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: res.contentType });

                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = res.nombreArchivo || nombreDocumento;
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

    previsualizarDoc(nombreDocumento: string): void {
        this._proveedoresService.descargarArchivoCuestionario(this.idCuestionario, nombreDocumento).subscribe({
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
                    window.open(fileURL, '_blank');
                }
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'No se pudo previsualizar el archivo.', 'error');
            }
        });
    }

    eliminarDoc(nombreDocumento: string): void {
        if (this.cuestionario?.bloqueado) return;
        
        Swal.fire({
            title: '¿Eliminar archivo?',
            text: `¿Estás seguro de eliminar el archivo adjunto para "${nombreDocumento}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                confirmButton: 'inline-flex items-center justify-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-all mx-2',
                cancelButton: 'inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-lg transition-all mx-2'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this._proveedoresService.eliminarArchivoCuestionario(this.idCuestionario, nombreDocumento).subscribe({
                    next: () => {
                        delete this.archivosCargados[nombreDocumento];
                        
                        const doc = this.cuestionario.documentos.find((d: any) => d.nombreDocumento === nombreDocumento);
                        if (doc) {
                            doc.estado = 'Pendiente';
                            doc.fechaActualizacion = new Date();
                        }

                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El archivo ha sido eliminado.',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false
                        });
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error');
                    }
                });
            }
        });
    }

    guardarCuestionarioPublico(): void {
        if (this.cuestionario.bloqueado) return;

        if (!this.cuestionario.nombreProveedor || this.cuestionario.nombreProveedor.trim() === '') {
            Swal.fire('Atención', 'Debe ingresar su Nombre Comercial / Razón Social.', 'warning');
            return;
        }

        const documentosPendientes = this.cuestionario.documentos.filter((d: any) => d.estado === 'Pendiente');
        if (documentosPendientes.length > 0) {
            Swal.fire({
                title: 'Documentación incompleta',
                text: `Tiene ${documentosPendientes.length} documento(s) marcado(s) como Pendiente. Se recomienda subir todos los archivos obligatorios antes de enviar. ¿Desea enviar y bloquear el formulario de todos modos?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, enviar y bloquear',
                cancelButtonText: 'Seguir editando',
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    confirmButton: 'inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all mx-2',
                    cancelButton: 'inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold rounded-lg transition-all mx-2'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    this.procederAGuardar();
                }
            });
        } else {
            Swal.fire({
                title: '¿Confirmar envío?',
                text: 'Una vez enviado, el cuestionario quedará bloqueado y no podrá realizar modificaciones. Se enviará a revisión de nuestro personal staff.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, enviar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.procederAGuardar();
                }
            });
        }
    }

    procederAGuardar(): void {
        Swal.fire({
            title: 'Enviando respuestas...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this._proveedoresService.saveCuestionarioPublico(this.cuestionario).subscribe({
            next: (res) => {
                if (res && res.success) {
                    this.cuestionario = res.data;
                    Swal.fire({
                        title: '¡Enviado con éxito!',
                        text: 'El cuestionario ha sido enviado y bloqueado correctamente. Nos pondremos en contacto con usted tras la revisión.',
                        icon: 'success',
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#4f46e5'
                    });
                } else {
                    Swal.fire('Error', res.message || 'No se pudieron enviar las respuestas.', 'error');
                }
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', err.error?.message || 'Ocurrió un error en el servidor al enviar las respuestas.', 'error');
            }
        });
    }
}
