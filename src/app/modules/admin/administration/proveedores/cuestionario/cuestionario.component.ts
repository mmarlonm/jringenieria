import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProveedoresService } from '../proveedores.service';
import { SolicitudCompraService } from '../../solicitudes-compra/solicitud-compra.service';
import { ProveedorDto } from '../../solicitudes-compra/models/solicitud-compra.types';
import Swal from 'sweetalert2';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ImagePreviewDialogComponent } from 'app/modules/admin/dashboards/tasks/task-media-dialog/task-media-dialog-viewer.component';

@Component({
    selector: 'app-cuestionario',
    templateUrl: './cuestionario.component.html',
    styleUrls: ['./cuestionario.component.scss'],
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
        MatDatepickerModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatTooltipModule,
        MatDialogModule
    ]
})
export class CuestionarioComponent implements OnInit, AfterViewInit {
    // Modo de vista: 'list' | 'form'
    viewMode: 'list' | 'form' = 'list';

    // Configuración de la tabla
    displayedColumns: string[] = ['idCuestionario', 'nombreProveedor', 'rfcProveedor', 'correoAdministrativo', 'sucursalSolicitante', 'fechaRegistro', 'estatus', 'acciones'];
    dataSource = new MatTableDataSource<any>();
    cuestionariosCount: number = 0;
    searchText: string = '';

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    // Datos maestros
    usuariosList: any[] = [];
    tipoProveedorCatalog: any[] = [];
    categoriaCatalog: any[] = [];
    monedaCatalog: any[] = [];

    // Búsqueda de proveedores CONTPAQi
    filteredProveedores: ProveedorDto[] = [];
    searchProveedorSubject = new Subject<string>();
    providerSelected: ProveedorDto | null = null;

    // Cuestionario Activo / Formulario
    activeCuestionario: any = null;

    archivosCargados: { [nombreDocumento: string]: string } = {};
    isUploadingDoc: { [nombreDocumento: string]: boolean } = {};
    isSyncing: boolean = false;

    // Estado de la autorización activa
    autorizacion = {
        resultadoRevision: 'Aprobado',
        fechaAprobacion: new Date(),
        aprobadoPor: null as number | null,
        comentariosFinales: ''
    };
    originalAutorizacion: any = null;
    currentUserId: number = 1;

    constructor(
        private _proveedoresService: ProveedoresService,
        private _solicitudesService: SolicitudCompraService,
        private _dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadCuestionarios();
        this.loadMasters();
        this.setupProveedorSearch();
        this.currentUserId = this._getCurrentUserId();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadCuestionarios(): void {
        this._proveedoresService.getCuestionarios().subscribe({
            next: (res) => {
                if (res && res.success) {
                    const list = res.data || [];
                    this.cuestionariosCount = list.length;
                    this.dataSource.data = list;
                }
            },
            error: (err) => console.error('Error al cargar cuestionarios:', err)
        });
    }

    loadMasters(): void {
        // Cargar usuarios
        this._proveedoresService.getUsuarios().subscribe({
            next: (users) => this.usuariosList = users || [],
            error: (err) => console.error('Error al cargar usuarios:', err)
        });

        // Cargar catálogos dinámicos
        this._proveedoresService.getCatalogosPorTipo('TIPO_PROVEEDOR').subscribe({
            next: (res) => {
                if (res && res.success) this.tipoProveedorCatalog = res.data || [];
            }
        });

        this._proveedoresService.getCatalogosPorTipo('CATEGORIA').subscribe({
            next: (res) => {
                if (res && res.success) this.categoriaCatalog = res.data || [];
            }
        });

        this._proveedoresService.getCatalogosPorTipo('MONEDA').subscribe({
            next: (res) => {
                if (res && res.success) this.monedaCatalog = res.data || [];
            }
        });
    }

    setupProveedorSearch(): void {
        this.searchProveedorSubject.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            switchMap(value => this._solicitudesService.buscarProveedores(value))
        ).subscribe({
            next: (res) => {
                this.filteredProveedores = res || [];
            },
            error: (err) => console.error(err)
        });
    }

    onProveedorSearchKeyup(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (value.trim().length >= 2) {
            this.searchProveedorSubject.next(value);
        }
    }

    selectProveedor(prov: ProveedorDto): void {
        this.providerSelected = prov;
        if (this.activeCuestionario) {
            // Extraer el ID numérico a partir del código del proveedor (Ej: PRV00012 -> 12)
            const numericId = parseInt(prov.codigo.replace(/\D/g, '')) || Math.floor(Math.random() * 10000) + 1;
            this.activeCuestionario.idProveedor = numericId;
            this.activeCuestionario.nombreProveedor = prov.nombre;
            this.activeCuestionario.rfcProveedor = prov.rfc;

            // Prefiltrar o rellenar campos que coincidan
            this.activeCuestionario.banco = prov.cuenta_Bancaria ? 'CONTPAQ' : '';
            this.activeCuestionario.correoAdministrativo = prov.email || '';
        }
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    addCuestionario(): void {
        this.nuevoCuestionario();
        this.viewMode = 'form';
    }

    editCuestionario(cuestionario: any): void {
        this.selectCuestionario(cuestionario);
        this.viewMode = 'form';
    }

    volverListado(): void {
        this.viewMode = 'list';
        this.loadCuestionarios();
    }

    nuevoCuestionario(): void {
        this.providerSelected = null;
        this.activeCuestionario = {
            idCuestionario: 0,
            idProveedor: null,
            nombreProveedor: '',
            rfcProveedor: '',
            productosServicios: '',
            paginaWeb: '',
            constanciaActualizada: false,
            opinionSATPositiva: false,
            correoAdministrativo: '',
            banco: '',
            cuentaBancaria: '',
            clabe: '',
            condicionesPago: '',
            sucursalSolicitante: '',
            usoEsperado: '',
            tiempoPromedioEntrega: '',
            certificacionesCalidad: false,
            requiereAccesoPlanta: false,
            cumpleEPP: false,
            observacionesRiesgos: '',
            documentos: [
                { idDocEstado: 0, nombreDocumento: 'Constancia de situación fiscal', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Opinión de cumplimiento SAT', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Carátula bancaria', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Identificación representante legal', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Comprobante de domicilio', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Acta constitutiva / poder notarial', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Catálogo / lista de precios', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Carta de garantías', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Referencias comerciales', estado: 'Pendiente' },
                { idDocEstado: 0, nombreDocumento: 'Documentación de seguridad si aplica', estado: 'Pendiente' }
            ]
        };

        this.autorizacion = {
            resultadoRevision: 'Pendiente',
            fechaAprobacion: new Date(),
            aprobadoPor: null,
            comentariosFinales: ''
        };
        this.originalAutorizacion = null;
    }

    obtenerUltimoEstatus(cuestionario: any): string {
        if (cuestionario.autorizaciones && cuestionario.autorizaciones.length > 0) {
            return cuestionario.autorizaciones[cuestionario.autorizaciones.length - 1].resultadoRevision || 'Pendiente';
        }
        return 'Pendiente';
    }

    puedeCambiarEstatus(cuestionario: any): boolean {
        if (!cuestionario.autorizaciones || cuestionario.autorizaciones.length === 0) {
            return false;
        }
        const lastAuth = cuestionario.autorizaciones[cuestionario.autorizaciones.length - 1];
        return lastAuth.aprobadoPor === this.currentUserId;
    }

    cambiarEstatusEnTabla(cuestionario: any, nuevoEstatus: string): void {
        const lastAuth = cuestionario.autorizaciones && cuestionario.autorizaciones.length > 0
            ? cuestionario.autorizaciones[cuestionario.autorizaciones.length - 1]
            : null;

        if (!lastAuth || lastAuth.aprobadoPor !== this.currentUserId) {
            Swal.fire('Acceso denegado', 'No tienes permisos. Solo el revisor asignado puede cambiar el estatus de este cuestionario.', 'error');
            this.loadCuestionarios();
            return;
        }

        if (nuevoEstatus === 'Aprobado') {
            Swal.fire({
                title: '¿Confirmar aprobación y firmar?',
                text: 'Esta acción registrará tu firma de aprobación digital y transferirá el proveedor al Catálogo Maestro.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, aprobar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Procesando aprobación...',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    this._proveedoresService.aprobarCheck(cuestionario.idCuestionario, this.currentUserId).subscribe({
                        next: (res) => {
                            if (res && res.success) {
                                Swal.fire({
                                    title: '¡Aprobado!',
                                    text: 'El cuestionario ha sido aprobado y el proveedor se ha agregado al Catálogo Maestro.',
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                                this.loadCuestionarios();
                            } else {
                                Swal.fire('Error', res.message || 'No se pudo aprobar el cuestionario.', 'error');
                                this.loadCuestionarios();
                            }
                        },
                        error: (err) => {
                            console.error(err);
                            Swal.fire('Error', err.error?.message || 'Error al intentar aprobar.', 'error');
                            this.loadCuestionarios();
                        }
                    });
                } else {
                    this.loadCuestionarios();
                }
            });
        } else {
            const payload = {
                idCuestionario: cuestionario.idCuestionario,
                resultadoRevision: nuevoEstatus,
                fechaAprobacion: new Date(),
                aprobadoPor: this.currentUserId,
                comentariosFinales: `Dictaminado como ${nuevoEstatus} desde el listado general.`
            };

            Swal.fire({
                title: 'Actualizando estatus...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            this._proveedoresService.autorizarProveedor(payload).subscribe({
                next: (res) => {
                    if (res && res.success) {
                        Swal.fire({
                            title: 'Actualizado',
                            text: `Cuestionario marcado como ${nuevoEstatus}.`,
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        this.loadCuestionarios();
                    } else {
                        Swal.fire('Error', res.message || 'No se pudo actualizar.', 'error');
                        this.loadCuestionarios();
                    }
                },
                error: (err) => {
                    console.error(err);
                    Swal.fire('Error', 'Error al intentar actualizar.', 'error');
                    this.loadCuestionarios();
                }
            });
        }
    }

    selectCuestionario(cuestionario: any): void {
        this.nuevoCuestionario();
        this.activeCuestionario = JSON.parse(JSON.stringify(cuestionario));
        
        // Cargar última autorización si existe
        if (this.activeCuestionario.autorizaciones && this.activeCuestionario.autorizaciones.length > 0) {
            const lastAuth = this.activeCuestionario.autorizaciones[this.activeCuestionario.autorizaciones.length - 1];
            this.autorizacion = {
                resultadoRevision: lastAuth.resultadoRevision,
                fechaAprobacion: lastAuth.fechaAprobacion ? new Date(lastAuth.fechaAprobacion) : new Date(),
                aprobadoPor: lastAuth.aprobadoPor,
                comentariosFinales: lastAuth.comentariosFinales || ''
            };
        }
        this.originalAutorizacion = JSON.parse(JSON.stringify(this.autorizacion));
        this.archivosCargados = {};
        this.isUploadingDoc = {};

        if (this.activeCuestionario.idCuestionario !== 0) {
            this.loadCuestionarioFiles(this.activeCuestionario.idCuestionario);
        }

        // Tratar de recuperar el nombre del proveedor en base al IdProveedor y campos guardados
        if (this.activeCuestionario.idProveedor) {
            this.providerSelected = {
                codigo: 'PRV' + this.activeCuestionario.idProveedor,
                nombre: this.activeCuestionario.nombreProveedor || 'Proveedor ID: ' + this.activeCuestionario.idProveedor,
                rfc: this.activeCuestionario.rfcProveedor || '',
                cuenta_Bancaria: this.activeCuestionario.cuentaBancaria || '',
                email: this.activeCuestionario.correoAdministrativo || '',
                tipo: ''
            };
        } else {
            this.providerSelected = null;
        }
    }

    reenviarNotificacion(): void {
        if (!this.activeCuestionario || this.activeCuestionario.idCuestionario === 0) {
            return;
        }

        if (!this.autorizacion.aprobadoPor) {
            Swal.fire('Atención', 'Debe seleccionar un aprobador primero.', 'warning');
            return;
        }

        Swal.fire({
            title: 'Reenviando notificaciones...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this._proveedoresService.reenviarNotificacion(this.activeCuestionario.idCuestionario, this.autorizacion.aprobadoPor).subscribe({
            next: (res) => {
                if (res && res.success) {
                    Swal.fire({
                        title: '¡Reenviado!',
                        text: 'Las notificaciones de correo y WhatsApp se enviaron correctamente.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire('Error', res.message || 'No se pudo reenviar la notificación.', 'error');
                }
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'Error al intentar reenviar las notificaciones.', 'error');
            }
        });
    }

    guardarCuestionario(): void {
        if (!this.activeCuestionario.nombreProveedor || this.activeCuestionario.nombreProveedor.trim() === '') {
            Swal.fire('Atención', 'Debe ingresar el nombre del proveedor.', 'warning');
            return;
        }

        if (!this.activeCuestionario.idProveedor || this.activeCuestionario.idProveedor === 0) {
            this.activeCuestionario.idProveedor = null;
        }

        Swal.fire({
            title: 'Guardando cuestionario...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this._proveedoresService.saveCuestionario(this.activeCuestionario).subscribe({
            next: (res) => {
                if (res && res.success) {
                    this.activeCuestionario = res.data;
                    
                    // Comprobar si la autorización ha cambiado o si es nueva
                    const authChanged = !this.originalAutorizacion || 
                        JSON.stringify(this.autorizacion) !== JSON.stringify(this.originalAutorizacion);

                    if (authChanged && this.autorizacion.resultadoRevision) {
                        const payload = {
                            idCuestionario: this.activeCuestionario.idCuestionario,
                            resultadoRevision: this.autorizacion.resultadoRevision,
                            fechaAprobacion: this.autorizacion.fechaAprobacion,
                            aprobadoPor: this.autorizacion.aprobadoPor,
                            comentariosFinales: this.autorizacion.comentariosFinales
                        };
                        this._proveedoresService.autorizarProveedor(payload).subscribe({
                            next: () => {
                                Swal.fire('¡Éxito!', 'Cuestionario y dictamen guardados correctamente.', 'success').then(() => {
                                    this.volverListado();
                                });
                            },
                            error: (authErr) => {
                                console.error('Error al guardar dictamen:', authErr);
                                Swal.fire('Cuestionario guardado', 'Se guardó el cuestionario pero hubo un error al registrar el dictamen de autorización.', 'warning').then(() => {
                                    this.volverListado();
                                });
                            }
                        });
                    } else {
                        Swal.fire('¡Éxito!', 'Cuestionario guardado correctamente.', 'success').then(() => {
                            this.volverListado();
                        });
                    }
                } else {
                    Swal.fire('Error', res.message || 'No se pudo guardar el cuestionario', 'error');
                }
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', 'Error en el servidor al intentar guardar.', 'error');
            }
        });
    }

    eliminarCuestionario(id: number): void {
        Swal.fire({
            title: '¿Eliminar cuestionario?',
            text: 'Esta acción borrará permanentemente el cuestionario.',
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
                this._proveedoresService.deleteCuestionario(id).subscribe({
                    next: (res) => {
                        if (res && res.success) {
                            this.loadCuestionarios();
                            Swal.fire({
                                title: '¡Eliminado!',
                                text: 'Cuestionario eliminado correctamente',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            });
                        } else {
                            Swal.fire('Error', res.message || 'No se pudo eliminar el cuestionario', 'error');
                        }
                    },
                    error: (err) => {
                        console.error(err);
                        Swal.fire('Error', 'Error al intentar eliminar el cuestionario.', 'error');
                    }
                });
            }
        });
    }

    loadCuestionarioFiles(idCuestionario: number): void {
        if (!idCuestionario) return;
        this._proveedoresService.getArchivosCuestionario(idCuestionario).subscribe({
            next: (res) => {
                if (res && res.success) {
                    const list = res.data || [];
                    this.archivosCargados = {};
                    list.forEach((f: any) => {
                        this.archivosCargados[f.nombreDocumento] = f.nombreArchivo;
                    });
                }
            },
            error: (err) => console.error('Error al cargar archivos de cuestionario:', err)
        });
    }

    onFileSelected(event: any, nombreDocumento: string): void {
        const file = event.target.files[0];
        if (!file) return;

        const idCuestionario = this.activeCuestionario.idCuestionario;
        if (!idCuestionario) return;

        this.isUploadingDoc[nombreDocumento] = true;
        this._proveedoresService.subirArchivoCuestionario(idCuestionario, file, nombreDocumento).subscribe({
            next: (res) => {
                this.isUploadingDoc[nombreDocumento] = false;
                this.archivosCargados[nombreDocumento] = res.nombreArchivo;
                
                const doc = this.activeCuestionario.documentos.find((d: any) => d.nombreDocumento === nombreDocumento);
                if (doc) {
                    doc.estado = 'Entregado';
                    doc.fechaActualizacion = new Date();
                }

                Swal.fire({
                    title: '¡Subido!',
                    text: 'Archivo cargado con éxito y estado actualizado a Entregado.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            error: (err) => {
                this.isUploadingDoc[nombreDocumento] = false;
                console.error(err);
                Swal.fire('Error', 'No se pudo subir el archivo.', 'error');
            }
        });
        event.target.value = '';
    }

    descargarDoc(nombreDocumento: string): void {
        const idCuestionario = this.activeCuestionario.idCuestionario;
        this._proveedoresService.descargarArchivoCuestionario(idCuestionario, nombreDocumento).subscribe({
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
        const idCuestionario = this.activeCuestionario.idCuestionario;
        this._proveedoresService.descargarArchivoCuestionario(idCuestionario, nombreDocumento).subscribe({
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
                    
                    const nombreArchivo = res.nombreArchivo || '';
                    const isPdf = nombreArchivo.toLowerCase().endsWith('.pdf');

                    this._dialog.open(ImagePreviewDialogComponent, {
                        data: {
                            url: fileURL,
                            name: nombreArchivo,
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

    eliminarDoc(nombreDocumento: string): void {
        const idCuestionario = this.activeCuestionario.idCuestionario;
        
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
                this._proveedoresService.eliminarArchivoCuestionario(idCuestionario, nombreDocumento).subscribe({
                    next: () => {
                        delete this.archivosCargados[nombreDocumento];
                        
                        const doc = this.activeCuestionario.documentos.find((d: any) => d.nombreDocumento === nombreDocumento);
                        if (doc) {
                            doc.estado = 'Pendiente';
                            doc.fechaActualizacion = new Date();
                        }

                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'El archivo ha sido eliminado y el estado se actualizó a Pendiente.',
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

    private _getCurrentUserId(): number {
        let userId = 1;
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = userInformation.usuario || {};
            userId = user.id || user.usuarioId || 1;
        } catch (e) {
            console.error('Error reading user from localStorage', e);
        }
        return userId;
    }

    getNombreUsuario(id: number | null | undefined): string {
        if (!id) return 'Sistema';
        const user = this.usuariosList.find(u => u.usuarioId === id);
        return user ? user.nombreUsuario : 'ID: ' + id;
    }

    verHistoricoModal(cuestionario: any): void {
        const autorizaciones = cuestionario.autorizaciones || [];
        if (autorizaciones.length === 0) {
            Swal.fire({
                title: 'Historial de Dictámenes',
                text: 'No hay dictámenes previos registrados para este cuestionario.',
                icon: 'info',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        let htmlContent = `
            <div style="overflow-x:auto; text-align:left; max-height:400px; padding: 4px;">
                <table style="width:100%; border-collapse:collapse; font-size:12px; font-family:inherit;">
                    <thead>
                        <tr style="background-color:#f8fafc; border-bottom:2px solid #e2e8f0; font-weight:bold; color:#475569;">
                            <th style="padding:10px 12px; text-transform:uppercase;">Estatus</th>
                            <th style="padding:10px 12px; text-transform:uppercase;">Fecha</th>
                            <th style="padding:10px 12px; text-transform:uppercase;">Revisor</th>
                            <th style="padding:10px 12px; text-transform:uppercase;">Comentarios</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        autorizaciones.forEach((auth: any) => {
            const fecha = auth.fechaAprobacion 
                ? new Date(auth.fechaAprobacion).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                : 'N/A';
            const aprobador = this.getNombreUsuario(auth.aprobadoPor);
            const comentarios = auth.comentariosFinales || 'Sin comentarios';
            
            let bg = '#fef3c7'; // amber
            let text = '#92400e';
            if (auth.resultadoRevision === 'Aprobado') {
                bg = '#d1fae5'; // emerald
                text = '#065f46';
            } else if (auth.resultadoRevision === 'Rechazado') {
                bg = '#fee2e2'; // rose
                text = '#991b1b';
            }

            htmlContent += `
                <tr style="border-bottom:1px solid #f1f5f9; hover:background-color:#f8fafc;">
                    <td style="padding:10px 12px; font-weight:600;">
                        <span style="display:inline-block; padding:3px 8px; border-radius:9999px; font-size:10px; font-weight:bold; background-color:${bg}; color:${text};">${auth.resultadoRevision}</span>
                    </td>
                    <td style="padding:10px 12px; color:#64748b; font-family:monospace;">${fecha}</td>
                    <td style="padding:10px 12px; font-weight:bold; color:#334155;">${aprobador}</td>
                    <td style="padding:10px 12px; color:#475569; max-width:240px; word-break:break-word;">${comentarios}</td>
                </tr>
            `;
        });

        htmlContent += `
                    </tbody>
                </table>
            </div>
        `;

        Swal.fire({
            title: `Historial - ${cuestionario.nombreProveedor || 'Cuestionario #' + cuestionario.idCuestionario}`,
            html: htmlContent,
            width: '700px',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#3b82f6',
            customClass: {
                popup: 'rounded-3xl shadow-xl border border-gray-100'
            }
        });
    }

    aprobarCuestionario(): void {
        if (!this.activeCuestionario || this.activeCuestionario.idCuestionario === 0) {
            Swal.fire('Atención', 'El cuestionario debe estar guardado antes de ser aprobado.', 'warning');
            return;
        }

        const idUsuario = this.currentUserId;

        Swal.fire({
            title: '¿Firmar y aprobar cuestionario?',
            text: 'Esta acción registrará tu firma digital de aprobación para este proveedor.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Procesando aprobación...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this._proveedoresService.aprobarCheck(this.activeCuestionario.idCuestionario, idUsuario).subscribe({
                    next: (res) => {
                        if (res && res.success) {
                            Swal.fire({
                                title: '¡Aprobado!',
                                text: 'El cuestionario ha sido aprobado correctamente.',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            });
                            // Actualizar la vista local
                            this.autorizacion.resultadoRevision = 'Aprobado';
                            this.autorizacion.fechaAprobacion = new Date();
                            // Recargar el cuestionario de la base de datos
                            this._proveedoresService.getCuestionarioById(this.activeCuestionario.idCuestionario).subscribe({
                                next: (detailRes) => {
                                    if (detailRes && detailRes.success) {
                                        this.selectCuestionario(detailRes.data);
                                    }
                                }
                            });
                        } else {
                            Swal.fire('Error', res.message || 'No se pudo aprobar el cuestionario.', 'error');
                        }
                    },
                    error: (err) => {
                        console.error('Error al aprobar cuestionario:', err);
                        const msg = err.error?.message || err.message || 'Ocurrió un error al intentar aprobar.';
                        Swal.fire('Error', msg, 'error');
                    }
                });
            }
        });
    }

    sincronizarContpaqi(): void {
        Swal.fire({
            title: '¿Sincronizar proveedores?',
            text: 'Se importarán los proveedores de CONTPAQi. Aquellos que ya existan se actualizarán sin perder los datos editados en el CRM.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, sincronizar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.isSyncing = true;
                Swal.fire({
                    title: 'Sincronizando...',
                    text: 'Obteniendo datos de CONTPAQi y procesando en el CRM.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                this._proveedoresService.sincronizarProveedores().subscribe({
                    next: (res) => {
                        this.isSyncing = false;
                        Swal.fire('Éxito', res.message || 'Sincronización completada con éxito.', 'success');
                        this.loadCuestionarios();
                    },
                    error: (err) => {
                        this.isSyncing = false;
                        const errorMsg = err.error?.message || 'Ocurrió un error al sincronizar con CONTPAQi.';
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    }
}
