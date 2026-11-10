import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';

import { MatButtonModule } from '@angular/material/button';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { MatSelectModule } from '@angular/material/select';

import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatTabsModule } from '@angular/material/tabs';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EnvioClientesDialogComponent } from '../envio-clientes/envio-clientes-dialog.component';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subject, Subscription, takeUntil } from 'rxjs';

import Swal from 'sweetalert2';

import {
    SurveysProductsService,
    FormularioProductoDto,
    FormularioProductoSaveDto,
    CampoConfig,
    DisenoConfig,
    PasoFormularioConfig,
    FilaMatrizConfig,
    ColumnaMatrizConfig,
    EncuestaRespuestaResumenDto,
    EncuestaRespuestaDetalleDto
} from '../surveys.service';



@Component({

    selector: 'app-surveys-list',

    templateUrl: './surveys-list.component.html',

    styleUrls: ['./surveys-list.component.scss'],

    standalone: true,

    imports: [

        CommonModule,

        FormsModule,

        ReactiveFormsModule,

        MatIconModule,

        MatButtonModule,

        MatFormFieldModule,

        MatInputModule,

        MatSelectModule,

        MatSlideToggleModule,

        MatTooltipModule,

        MatTabsModule,

        MatDialogModule,

        MatSnackBarModule

    ]

})

export class SurveysListComponent implements OnInit, OnDestroy {

    private _surveyService = inject(SurveysProductsService);

    private _cdr = inject(ChangeDetectorRef);

    private _snackBar = inject(MatSnackBar);

    private _dialog = inject(MatDialog);

    dialogoEnvioAbierto = false;

    private _destroy$ = new Subject<void>();
    // Solo cuenta la última petición de cada tipo: una respuesta tardía no debe pisar a la actual.
    private _subRespuestas?: Subscription;
    private _subDetalleRespuesta?: Subscription;



    // Control de vista: 'listado' o 'editor'

    vistaActual: 'listado' | 'editor' = 'listado';



    // Sub-pestaña en la vista listado: 'formularios' o 'respuestas'

    subTabListado: 'formularios' | 'respuestas' = 'formularios';



    // Pestaña activa en el editor

    activeTab: 'general' | 'campos' | 'diseno' | 'enlace' | 'respuestas' = 'general';



    // Vista previa de dispositivo en simulador

    previewDevice: 'desktop' | 'tablet' | 'mobile' = 'desktop';



    // Listado de Formularios

    formulariosList: FormularioProductoDto[] = [];

    cargandoListado = false;

    busquedaListado = '';

    filtroEstado: 'todos' | 'activos' | 'inactivos' = 'todos';

    copiadoId: number | null = null;



    // Métricas globales

    totalRespuestasGeneral = 0;

    totalActivosGeneral = 0;

    totalProductosGeneral = 0;

    totalServiciosGeneral = 0;

    promedioSatisfaccionGeneral = 9.2;



    // Filtro por tipo en listado

    filtroTipo: 'todos' | 'producto' | 'servicio' = 'todos';

    filtroTipoRespuesta: 'todos' | 'producto' | 'servicio' = 'todos';

    filtroFormularioId: number | 'todos' = 'todos';



    // Estados del Editor

    saving = false;

    currentFormId = 0;

    tipo: 'producto' | 'servicio' = 'producto';

    titulo = 'Encuesta de Satisfacción de Productos y Equipos';

    descripcion = 'En JR Ingeniería Eléctrica valoramos tu opinión. Por favor ayúdanos a evaluar tu experiencia para seguir ofreciéndote la mejor calidad.';

    slug = 'satisfaccion-productos';

    imagenPortadaUrl = 'assets/images/surveys/tableros-electricos.jpg';

    sucursalId: number | null = null;

    activo = true;

    campos: CampoConfig[] = [];

    diseno: DisenoConfig = {

        tipoFormulario: 'Satisfaccion',

        modoPasos: true,

        pasos: [

            { numero: 1, titulo: 'Datos de Contacto', descripcion: 'Información del evaluador' },

            { numero: 2, titulo: 'Evaluación del Servicio', descripcion: 'Atención, calidad y tiempos de entrega' },

            { numero: 3, titulo: 'Comentarios y Mejora', descripcion: 'Tus sugerencias para seguir creciendo' }

        ],

        colorPrimario: '#1e8449',

        colorFondo: '#f8fafc',

        estiloCard: 'glassmorphism',

        radioBorde: 'rounded-2xl',

        alturaPortada: 'medium',

        botonTexto: 'Enviar Encuesta de Satisfacción',

        mensajeExito: '¡Muchas gracias por tus comentarios! Tu retroalimentación es vital para continuar entregándote soluciones eléctricas con los más altos estándares de calidad y servicio.',

        mostrarQrExito: false,

        temaOscuro: false

    };



    // Respuestas recibidas
    respuestasList: EncuestaRespuestaResumenDto[] = [];
    cargandoRespuestas = false;
    errorCargaRespuestas = false;
    busquedaRespuestas = '';
    filtroRespuestaFormulario: number | 'todos' = 'todos';

    // Modales
    modalQrAbierto = false;
    formularioQrSeleccionado: FormularioProductoDto | null = null;
    modalDetalleAbierto = false;
    cargandoDetalleRespuesta = false;
    errorDetalleRespuesta = false;
    respuestaDetalleResumen: EncuestaRespuestaResumenDto | null = null;
    detalleRespuestaCompleto: EncuestaRespuestaDetalleDto | null = null;
    respuestaDetalleSeleccionada: any = null;



    // Estado Simulador Interactivo

    pasoSimuladorActual = 1;

    respuestasSimulador: { [key: string]: any } = {};

    simuladorEnviado = false;



    // Opciones y Catálogos

    paletasColores = [

        { nombre: 'Verde JR Corporativo', color: '#1e8449' },

        { nombre: 'Azul Eléctrico Tech', color: '#0284c7' },

        { nombre: 'Índigo Moderno', color: '#6366f1' },

        { nombre: 'Ámbar Energía', color: '#f59e0b' },

        { nombre: 'Esmeralda Pro', color: '#059669' },

        { nombre: 'Violeta Futurista', color: '#8b5cf6' },

        { nombre: 'Rojo Pasión', color: '#dc2626' },

        { nombre: 'Carbón Premium', color: '#1e293b' }

    ];



    portadasPresets = [

        { nombre: 'Tableros y Distribución', url: 'assets/images/surveys/tableros-electricos.jpg' },

        { nombre: 'Subestación y Media Tensión', url: 'assets/images/surveys/subestacion-electrica.jpg' },

        { nombre: 'Inspección de Calidad ISO', url: 'assets/images/surveys/inspeccion-calidad.jpg' },

        { nombre: 'Ingeniería y Monitoreo SCADA', url: 'assets/images/surveys/ingenieria-proyectos.jpg' }

    ];



    
    camposEstandar = [
        { value: '', label: 'Personalizado (Sin mapeo especial)' },
        { value: 'cliente_nombre', label: 'Nombre de Empresa / Cliente' },
        { value: 'evaluador_contacto', label: 'Nombre y Cargo del Evaluador' },
        { value: 'evaluador_email', label: 'Correo Electrónico' },
        { value: 'evaluador_telefono', label: 'Teléfono / WhatsApp' },
        { value: 'proyecto_producto', label: 'Producto o Solución Recibida' },
        { value: 'nps_satisfaccion', label: 'Calificación NPS / Recomendación' },
        { value: 'comentarios_mejora', label: 'Comentarios de Mejora ISO 9001' }
    ];

    tiposCampo = [
        { value: 'input', label: 'Texto corto (Input)', icon: 'edit' },
        { value: 'email', label: 'Correo electrónico', icon: 'alternate_email' },
        { value: 'tel', label: 'Teléfono / WhatsApp', icon: 'phone' },
        { value: 'number', label: 'Número', icon: 'tag' },
        { value: 'select', label: 'Menú desplegable (Select)', icon: 'arrow_drop_down_circle' },
        { value: 'radio', label: 'Opción única (Radio / Calificación)', icon: 'radio_button_checked' },
        { value: 'checkbox', label: 'Múltiple opción (Casillas)', icon: 'check_box' },
        { value: 'matrix', label: 'Tabla / Matriz Escala (1 a 5 / Personalizable)', icon: 'table_chart' },
        { value: 'section', label: 'Bloque / Separador de Sección', icon: 'bookmark' },
        { value: 'textarea', label: 'Área de texto (Comentarios/Párrafo)', icon: 'notes' },
        { value: 'file', label: 'Subir Archivo / Fotografía', icon: 'upload_file' }
    ];



    ngOnInit(): void {

        // Antes de cargar: el servicio avisa durante la propia carga si encontró encuestas guardadas solo en este navegador.
        this._surveyService.recuperados$
            .pipe(takeUntil(this._destroy$))
            .subscribe(recuperado => this.avisarEncuestasRecuperadas(recuperado.titulos, recuperado.pendientes));

        this._surveyService.servidorNoDisponible$
            .pipe(takeUntil(this._destroy$))
            .subscribe(() => this._snackBar.open(
                'No se pudo leer la lista del servidor. Se muestra la copia guardada en este navegador; lo que cambies no se guardará hasta que el servidor responda.',
                'Cerrar',
                { duration: 8000 }
            ));

        this.cargarListado();

        this.cargarRespuestas();

    }

    private avisarEncuestasRecuperadas(titulos: string[], pendientes: number): void {
        const escapar = (texto: string) => texto
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        let html = '';
        if (titulos.length > 0) {
            const lista = titulos.map(t => `<li>${escapar(t)}</li>`).join('');
            html += `<p>Estaban guardadas solo en este navegador y se subieron al servidor:</p><ul style="text-align:left;margin:8px 0 0 24px;list-style:disc">${lista}</ul>`;
        }
        if (pendientes > 0) {
            const detalle = titulos.length > 0
                ? `${pendientes} más no se pudieron subir todavía; se conservan en este navegador y se reintentará al abrir esta pantalla.`
                : `${pendientes} encuesta(s) guardada(s) solo en este navegador no se pudieron subir al servidor. Se conservan aquí y se reintentará al abrir esta pantalla.`;
            html += `<p style="margin-top:12px">${detalle}</p>`;
        }

        Swal.fire({
            icon: pendientes > 0 ? 'warning' : 'success',
            title: titulos.length > 0
                ? (titulos.length === 1 ? 'Se recuperó 1 encuesta' : `Se recuperaron ${titulos.length} encuestas`)
                : 'Encuestas pendientes de subir',
            html,
            confirmButtonText: 'Entendido'
        });
    }

    private mostrarErrorDelServidor(titulo: string, err: any, mensajePorDefecto: string): void {
        Swal.fire(titulo, err?.error?.message || mensajePorDefecto, 'error');
        this._cdr.markForCheck();
    }



    ngOnDestroy(): void {

        this._destroy$.next();

        this._destroy$.complete();

    }



    // =========================================================================

    // LISTADO Y GESTIÓN DE FORMULARIOS

    // =========================================================================



    cargarListado(): void {

        this.cargandoListado = true;

        this._surveyService.getFormularios()

            .pipe(takeUntil(this._destroy$))

            .subscribe({

                next: (res) => {

                    this.formulariosList = res || [];

                    this.actualizarMetricas();

                    this.cargandoListado = false;

                    this._cdr.markForCheck();

                },

                error: () => {

                    this.cargandoListado = false;

                    this._cdr.markForCheck();

                }

            });

    }



    actualizarMetricas(): void {

        this.totalActivosGeneral = this.formulariosList.filter(f => f.activo).length;

        const totalForms = this.formulariosList.reduce((acc, f) => acc + (f.totalRespuestas || 0), 0);

        this.totalRespuestasGeneral = Math.max(totalForms, this.respuestasList?.length || 0);

        this.totalProductosGeneral = this.formulariosList.filter(f => (f.tipo || 'producto') === 'producto').length;

        this.totalServiciosGeneral = this.formulariosList.filter(f => f.tipo === 'servicio').length;

    }



    get formulariosFiltrados(): FormularioProductoDto[] {

        return this.formulariosList.filter(f => {

            const fTipo = f.tipo || 'producto';

            const matchesTipo = this.filtroTipo === 'todos' || fTipo === this.filtroTipo;



            const matchesText = !this.busquedaListado ||

                f.titulo.toLowerCase().includes(this.busquedaListado.toLowerCase()) ||

                f.slug.toLowerCase().includes(this.busquedaListado.toLowerCase()) ||

                (f.descripcion && f.descripcion.toLowerCase().includes(this.busquedaListado.toLowerCase()));



            const matchesStatus = this.filtroEstado === 'todos' ||

                (this.filtroEstado === 'activos' && f.activo) ||

                (this.filtroEstado === 'inactivos' && !f.activo);



            return matchesTipo && matchesText && matchesStatus;

        });

    }



    nuevoFormulario(tipo: 'producto' | 'servicio' = 'producto'): void {

        this.currentFormId = 0;

        this.tipo = tipo;

        if (tipo === 'servicio') {

            this.titulo = 'Encuesta de Satisfacción de Servicios y Proyectos de Ingeniería';

            this.descripcion = 'En JR Ingeniería Eléctrica valoramos tu opinión sobre la ejecución y calidad técnica de nuestros servicios.';

            this.slug = 'servicio-' + Math.random().toString(36).substring(2, 8);

            this.imagenPortadaUrl = 'assets/images/surveys/subestacion-electrica.jpg';

            this.campos = this._surveyService.generarCamposPredeterminadosServicio();

            this.diseno = this._surveyService.generarDisenoPredeterminado('servicio');

        } else {

            this.titulo = 'Encuesta de Satisfacción de Productos y Equipos';

            this.descripcion = 'En JR Ingeniería Eléctrica valoramos tu opinión. Por favor ayúdanos a evaluar tu experiencia para seguir ofreciéndote la mejor calidad.';

            this.slug = 'producto-' + Math.random().toString(36).substring(2, 8);

            this.imagenPortadaUrl = 'assets/images/surveys/tableros-electricos.jpg';

            this.campos = this._surveyService.generarCamposPredeterminadosProducto();

            this.diseno = this._surveyService.generarDisenoPredeterminado('producto');

        }

        this.sucursalId = null;

        this.activo = true;

        this.activeTab = 'general';

        this.reiniciarSimulador();

        this.vistaActual = 'editor';

        this._cdr.markForCheck();

    }



    /** Permite cambiar el tipo de formulario en el editor */

    cambiarTipo(nuevoTipo: 'producto' | 'servicio'): void {

        if (this.tipo === nuevoTipo) return;

        this.tipo = nuevoTipo;

        if (this.currentFormId === 0) {

            if (nuevoTipo === 'servicio') {

                if (this.titulo.includes('Productos') || this.titulo.includes('Nueva Encuesta')) {

                    this.titulo = 'Encuesta de Satisfacción de Servicios y Proyectos de Ingeniería';

                }

                if (this.imagenPortadaUrl.includes('tableros')) {

                    this.imagenPortadaUrl = 'assets/images/surveys/subestacion-electrica.jpg';

                }

                this.campos = this._surveyService.generarCamposPredeterminadosServicio();

                this.diseno = this._surveyService.generarDisenoPredeterminado('servicio');

            } else {

                if (this.titulo.includes('Servicios') || this.titulo.includes('Nueva Encuesta')) {

                    this.titulo = 'Encuesta de Satisfacción de Productos y Equipos';

                }

                if (this.imagenPortadaUrl.includes('subestacion')) {

                    this.imagenPortadaUrl = 'assets/images/surveys/tableros-electricos.jpg';

                }

                this.campos = this._surveyService.generarCamposPredeterminadosProducto();

                this.diseno = this._surveyService.generarDisenoPredeterminado('producto');

            }

        }

        this._cdr.markForCheck();

    }



    editarFormulario(form: FormularioProductoDto): void {

        this.currentFormId = form.id;

        this.tipo = form.tipo || 'producto';

        this.titulo = form.titulo;

        this.descripcion = form.descripcion || '';

        this.slug = form.slug;

        this.imagenPortadaUrl = form.imagenPortadaUrl || 'assets/images/surveys/tableros-electricos.jpg';

        this.sucursalId = form.sucursalId || null;

        this.activo = form.activo;



        try {

            this.campos = JSON.parse(form.camposConfigJson || '[]');

        } catch {

            this.campos = this._surveyService.generarCamposPredeterminados();

        }



        try {

            this.diseno = JSON.parse(form.disenoConfigJson || '{}');

            if (!this.diseno.colorPrimario) this.diseno = this._surveyService.generarDisenoPredeterminado();

        } catch {

            this.diseno = this._surveyService.generarDisenoPredeterminado();

        }



        this.activeTab = 'general';

        this.reiniciarSimulador();

        this.vistaActual = 'editor';

        this._cdr.markForCheck();

    }



    /** Selecciona un preset de portada */

    seleccionarPresetPortada(url: string): void {

        this.imagenPortadaUrl = url;

        this._cdr.markForCheck();

    }



    /** Carga y convierte un archivo de imagen local a Data URL */

    onFileSelected(event: any): void {

        const file = event.target.files?.[0];

        if (!file) return;



        if (!file.type.startsWith('image/')) {

            this._snackBar.open('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).', 'Cerrar', { duration: 3000 });

            return;

        }



        if (file.size > 5 * 1024 * 1024) {

            this._snackBar.open('La imagen es demasiado pesada. Máximo permitido: 5MB.', 'Cerrar', { duration: 3000 });

            return;

        }



        const reader = new FileReader();

        reader.onload = (e: any) => {

            this.imagenPortadaUrl = e.target.result;

            this._snackBar.open('¡Foto cargada exitosamente como portada!', 'Aceptar', { duration: 2500 });

            this._cdr.markForCheck();

        };

        reader.readAsDataURL(file);

    }



    /** Elimina la imagen de portada */

    eliminarPortada(): void {

        this.imagenPortadaUrl = '';

        this._cdr.markForCheck();

    }



    duplicarFormulario(form: FormularioProductoDto): void {

        const clon: FormularioProductoSaveDto = {

            id: 0,

            slug: `${form.slug}-copia-${Math.random().toString(36).substring(2, 6)}`,

            titulo: `${form.titulo} (Copia)`,

            descripcion: form.descripcion,

            imagenPortadaUrl: form.imagenPortadaUrl,

            camposConfigJson: form.camposConfigJson,

            disenoConfigJson: form.disenoConfigJson,

            tipo: form.tipo || 'producto',

            sucursalId: form.sucursalId,

            activo: true

        };



        this._surveyService.guardarFormulario(clon)

            .pipe(takeUntil(this._destroy$))

            .subscribe({

                next: () => {

                    this._snackBar.open('¡Encuesta duplicada con éxito!', 'Cerrar', { duration: 3000 });

                    this.cargarListado();

                },

                error: (err) => this.mostrarErrorDelServidor('No se pudo duplicar', err, 'El servidor no respondió. La encuesta no se duplicó; intenta de nuevo en unos minutos.')

            });

    }



    eliminarFormulario(form: FormularioProductoDto): void {

        Swal.fire({

            title: '¿Eliminar encuesta?',

            text: `Se dará de baja "${form.titulo}". Sus respuestas recopiladas se conservarán en el historial.`,

            icon: 'warning',

            showCancelButton: true,

            confirmButtonColor: '#dc2626',

            cancelButtonColor: '#64748b',

            confirmButtonText: 'Sí, eliminar',

            cancelButtonText: 'Cancelar'

        }).then((result) => {

            if (result.isConfirmed) {

                this._surveyService.eliminarFormulario(form.id)

                    .pipe(takeUntil(this._destroy$))

                    .subscribe({

                        next: () => {

                            Swal.fire('Eliminado', 'La encuesta ha sido eliminada correctamente.', 'success');

                            this.cargarListado();

                        },

                        error: (err) => this.mostrarErrorDelServidor('No se pudo eliminar', err, 'El servidor no respondió. La encuesta no se eliminó; intenta de nuevo en unos minutos.')

                    });

            }

        });

    }



    toggleActivoFormulario(form: FormularioProductoDto): void {

        form.activo = !form.activo;

        const dto: FormularioProductoSaveDto = {

            id: form.id,

            slug: form.slug,

            titulo: form.titulo,

            descripcion: form.descripcion,

            imagenPortadaUrl: form.imagenPortadaUrl,

            camposConfigJson: form.camposConfigJson,

            disenoConfigJson: form.disenoConfigJson,
            tipo: form.tipo || 'producto',

            sucursalId: form.sucursalId,

            activo: form.activo

        };



        this._surveyService.guardarFormulario(dto)

            .pipe(takeUntil(this._destroy$))

            .subscribe({

                next: () => {

                    this.actualizarMetricas();

                    this._snackBar.open(`Encuesta ${form.activo ? 'activada' : 'desactivada'}`, 'Cerrar', { duration: 2500 });

                },

                error: (err) => {

                    // El servidor no lo guardó: el interruptor vuelve a su valor real para no mostrar algo que no es cierto.
                    form.activo = !form.activo;

                    this.mostrarErrorDelServidor('No se pudo cambiar el estado', err, 'El servidor no respondió. La encuesta quedó como estaba; intenta de nuevo en unos minutos.');

                }

            });

    }



    volverAListado(): void {

        this.vistaActual = 'listado';

        this.cargarListado();

        this._cdr.markForCheck();

    }



    // =========================================================================

    // GUARDADO DEL EDITOR

    // =========================================================================



    guardarFormulario(): void {

        if (!this.titulo.trim()) {

            this._snackBar.open('El título de la encuesta es obligatorio', 'Cerrar', { duration: 3000 });

            this.activeTab = 'general';

            return;

        }



        if (!this.slug.trim()) {

            this.generarSlugAutomatico();

        }



        this.saving = true;



        const dto: FormularioProductoSaveDto = {

            id: this.currentFormId,

            slug: this.slug.trim().toLowerCase(),

            titulo: this.titulo.trim(),

            descripcion: this.descripcion.trim(),

            imagenPortadaUrl: this.imagenPortadaUrl,

            camposConfigJson: JSON.stringify(this.campos),

            disenoConfigJson: JSON.stringify(this.diseno),

            tipo: this.tipo,

            sucursalId: this.sucursalId,

            activo: this.activo

        };



        this._surveyService.guardarFormulario(dto)

            .pipe(takeUntil(this._destroy$))

            .subscribe({

                next: (res) => {

                    this.saving = false;

                    this.currentFormId = res.id;

                    Swal.fire({

                        icon: 'success',

                        title: '¡Configuración Guardada!',

                        text: 'La encuesta de productos ha sido actualizada con éxito.',

                        timer: 2000,

                        showConfirmButton: false

                    });

                    this.cargarListado();

                    this._cdr.markForCheck();

                },

                error: (err) => {

                    this.saving = false;

                    Swal.fire('Error', err?.error?.message || 'Error al guardar la configuración.', 'error');

                    this._cdr.markForCheck();

                }

            });

    }



    guardarComoNueva(): void {
        if (!this.titulo.trim()) {
            this._snackBar.open('El título de la encuesta es obligatorio', 'Cerrar', { duration: 3000 });
            this.activeTab = 'general';
            return;
        }

        const baseSlug = this.slug.replace(/-(copia|[a-z0-9]{4,6})$/gi, '');
        const nuevoSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`.toLowerCase();

        this.saving = true;

        const dto: FormularioProductoSaveDto = {
            id: 0,
            slug: nuevoSlug,
            titulo: `${this.titulo.trim()} (Nueva)`,
            descripcion: this.descripcion.trim(),
            imagenPortadaUrl: this.imagenPortadaUrl,
            camposConfigJson: JSON.stringify(this.campos),
            disenoConfigJson: JSON.stringify(this.diseno),
            tipo: this.tipo,
            sucursalId: this.sucursalId,
            activo: this.activo
        };

        this._surveyService.guardarFormulario(dto)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (res) => {
                    this.saving = false;
                    this.currentFormId = res.id;
                    this.slug = res.slug;
                    this.titulo = res.titulo;
                    Swal.fire({
                        icon: 'success',
                        title: '¡Nueva Encuesta Creada!',
                        text: `Se ha guardado como una nueva encuesta con enlace: /${res.slug}`,
                        timer: 2500,
                        showConfirmButton: false
                    });
                    this.cargarListado();
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.saving = false;
                    Swal.fire('Error', err?.error?.message || 'Error al guardar la nueva encuesta.', 'error');
                    this._cdr.markForCheck();
                }
            });
    }

    generarSlugAutomatico(): void {
        let base = this.titulo.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!base) {
            base = 'encuesta-' + Math.random().toString(36).substring(2, 6);
        }

        if (this.currentFormId === 0) {
            const repetido = this.formulariosList.some(f => f.slug.toLowerCase() === base.toLowerCase());
            if (repetido) {
                base = `${base}-${Math.random().toString(36).substring(2, 6)}`;
            }
        }

        this.slug = base;
    }



    // =========================================================================

    // COMPARTIR Y CÓDIGO QR

    // =========================================================================



    obtenerUrlPublica(slug: string): string {

        const origin = window.location.origin + window.location.pathname;

        const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

        return `${cleanOrigin}#/survey-productos/${slug}`;

    }



    copiarEnlacePublico(slug: string, id: number): void {

        const url = this.obtenerUrlPublica(slug);

        navigator.clipboard.writeText(url).then(() => {

            this.copiadoId = id;

            this._snackBar.open('¡Enlace público copiado al portapapeles!', 'Cerrar', { duration: 3000 });

            setTimeout(() => {

                this.copiadoId = null;

                this._cdr.markForCheck();

            }, 3000);

            this._cdr.markForCheck();

        });

    }



    abrirEnNuevaPestana(slug: string): void {

        const url = this.obtenerUrlPublica(slug);

        window.open(url, '_blank');

    }



    abrirModalQr(form: FormularioProductoDto): void {

        this.formularioQrSeleccionado = form;

        this.modalQrAbierto = true;

    }



    cerrarModalQr(): void {

        this.modalQrAbierto = false;

        this.formularioQrSeleccionado = null;
    }

    abrirEnvioClientes(form?: FormularioProductoDto | { id: number; titulo: string; activo: boolean }): void {
        const target = form ?? (this.currentFormId > 0 && this.activo ? { id: this.currentFormId, titulo: this.titulo, activo: this.activo } : null);
        if (!target || !target.activo || target.id <= 0 || this.dialogoEnvioAbierto) {
            return;
        }

        this.dialogoEnvioAbierto = true;
        const dialogRef = this._dialog.open(EnvioClientesDialogComponent, {
            data: {
                formularioId: target.id,
                titulo: target.titulo,
            },
            width: '1000px',
            maxWidth: '96vw',
        });

        dialogRef.afterClosed().subscribe(() => {
            this.dialogoEnvioAbierto = false;
        });

    }



    obtenerQrUrl(slug: string): string {

        const formUrl = this.obtenerUrlPublica(slug);

        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formUrl)}`;

    }



    descargarQrPng(slug: string): void {

        const qrUrl = this.obtenerQrUrl(slug);

        const link = document.createElement('a');

        link.href = qrUrl;

        link.download = `QR-Encuesta-${slug}.png`;

        link.target = '_blank';

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

    }



    // =========================================================================

    // GESTIÓN DE CAMPOS DINÁMICOS

    // =========================================================================



    agregarCampo(tipo: 'input' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'tel' | 'matrix' | 'section' = 'input'): void {

        const nuevoOrden = this.campos.length + 1;

        const nuevoCampo: CampoConfig = {

            id: 'campo_' + Date.now().toString(36),

            tipo: tipo,

            etiqueta: tipo === 'section' ? `SECCIÓN ${nuevoOrden}: NUEVO BLOQUE` : (tipo === 'matrix' ? 'Matriz de Evaluación de Calidad' : `Pregunta ${nuevoOrden}`),

            placeholder: tipo === 'section' ? 'Subtítulo o descripción de la sección...' : 'Escribe tu respuesta aquí...',

            requerido: tipo !== 'section',

            ancho: 'full',

            orden: nuevoOrden,

            paso: this.diseno.modoPasos ? 1 : undefined,

            opciones: (tipo === 'radio' || tipo === 'select' || tipo === 'checkbox') ? ['Excelente', 'Bueno', 'Regular', 'Malo'] : undefined,

            filasMatriz: tipo === 'matrix' ? [

                { id: 'f1', texto: 'Atención y asesoría técnica del personal', subtexto: 'Disposición y amabilidad' },

                { id: 'f2', texto: 'Calidad de acabados y especificaciones', subtexto: 'Cumplimiento de estándares de ingeniería' },

                { id: 'f3', texto: 'Tiempo y puntualidad de entrega', subtexto: 'Cumplimiento del cronograma convenido' }

            ] : undefined,

            columnasMatriz: tipo === 'matrix' ? [

                { valor: '1', etiqueta: '1 ⭐' },

                { valor: '2', etiqueta: '2 ⭐' },

                { valor: '3', etiqueta: '3 ⭐' },

                { valor: '4', etiqueta: '4 ⭐' },

                { valor: '5', etiqueta: '5 ⭐' }

            ] : undefined

        };

        this.campos.push(nuevoCampo);

        this._cdr.markForCheck();

    }



    duplicarCampo(index: number): void {

        const orig = this.campos[index];

        const copia: CampoConfig = JSON.parse(JSON.stringify(orig));

        copia.id = 'campo_' + Date.now().toString(36);

        copia.etiqueta = `${copia.etiqueta} (Copia)`;

        copia.orden = this.campos.length + 1;

        this.campos.splice(index + 1, 0, copia);

        this.reordenarCampos();

        this._snackBar.open('Campo duplicado', 'Cerrar', { duration: 2000 });

        this._cdr.markForCheck();

    }



    eliminarCampo(index: number): void {

        this.campos.splice(index, 1);

        this.reordenarCampos();

        this._cdr.markForCheck();

    }



    moverCampo(index: number, direccion: 'arriba' | 'abajo'): void {

        if (direccion === 'arriba' && index > 0) {

            const temp = this.campos[index];

            this.campos[index] = this.campos[index - 1];

            this.campos[index - 1] = temp;

        } else if (direccion === 'abajo' && index < this.campos.length - 1) {

            const temp = this.campos[index];

            this.campos[index] = this.campos[index + 1];

            this.campos[index + 1] = temp;

        }

        this.reordenarCampos();

        this._cdr.markForCheck();

    }



    reordenarCampos(): void {

        this.campos.forEach((c, idx) => c.orden = idx + 1);

    }



    cargarPreguntasEstandar(): void {

        Swal.fire({

            title: '¿Cargar preguntas estándar ISO 9001?',

            text: 'Se cargarán las 8 preguntas oficiales de satisfacción de productos JR. Puedes editarlas o agregar más después.',

            icon: 'question',

            showCancelButton: true,

            confirmButtonColor: '#1e8449',

            confirmButtonText: 'Sí, cargar plantilla'

        }).then((result) => {

            if (result.isConfirmed) {

                this.campos = this._surveyService.generarCamposPredeterminados();

                this._snackBar.open('Plantilla estándar cargada', 'Cerrar', { duration: 2500 });

                this._cdr.markForCheck();

            }

        });

    }



    agregarOpcion(campo: CampoConfig): void {

        if (!campo.opciones) campo.opciones = [];

        campo.opciones.push(`Opción ${campo.opciones.length + 1}`);

        this._cdr.markForCheck();

    }



    eliminarOpcion(campo: CampoConfig, optIndex: number): void {

        if (!campo.opciones) return;

        campo.opciones.splice(optIndex, 1);

        this._cdr.markForCheck();

    }



    agregarFilaMatriz(campo: CampoConfig): void {

        if (!campo.filasMatriz) campo.filasMatriz = [];

        const num = campo.filasMatriz.length + 1;

        campo.filasMatriz.push({

            id: 'f_' + Date.now().toString(36),

            texto: `Nuevo Criterio ${num}`,

            subtexto: 'Descripción del criterio de evaluación'

        });

        this._cdr.markForCheck();

    }



    eliminarFilaMatriz(campo: CampoConfig, filaIndex: number): void {

        if (!campo.filasMatriz || campo.filasMatriz.length <= 1) return;

        campo.filasMatriz.splice(filaIndex, 1);

        this._cdr.markForCheck();

    }



    // =========================================================================

    // GESTIÓN DE PASOS DEL WIZARD

    // =========================================================================



    agregarPasoWizard(): void {

        if (!this.diseno.pasos) this.diseno.pasos = [];

        const nuevoNum = this.diseno.pasos.length + 1;

        this.diseno.pasos.push({

            numero: nuevoNum,

            titulo: `Paso ${nuevoNum}: Nueva Sección`,

            descripcion: 'Detalle del paso'

        });

        this._cdr.markForCheck();

    }



    eliminarPasoWizard(numero: number): void {

        if (!this.diseno.pasos || this.diseno.pasos.length <= 1) {

            this._snackBar.open('Debe existir al menos un paso en modo wizard', 'Cerrar', { duration: 2500 });

            return;

        }

        this.diseno.pasos = this.diseno.pasos.filter(p => p.numero !== numero);

        this.diseno.pasos.forEach((p, idx) => p.numero = idx + 1);

        // Reasignar campos a paso 1 si su paso fue eliminado

        this.campos.forEach(c => {

            if (c.paso && c.paso > this.diseno.pasos.length) {

                c.paso = 1;

            }

        });

        this._cdr.markForCheck();

    }



    // =========================================================================

    // SIMULADOR INTERACTIVO

    // =========================================================================



    get camposSimuladorPasoActual(): CampoConfig[] {
        return this.campos.filter(c => {
            const matchesPaso = !this.diseno.modoPasos || Number(c.paso || 1) === Number(this.pasoSimuladorActual);
            return matchesPaso && this.esCampoVisible(c);
        });
    }



    simuladorSeleccionarRating(campoId: string, valor: any): void {

        this.respuestasSimulador[campoId] = valor;

        this._cdr.markForCheck();

    }



    simuladorSiguientePaso(): void {

        if (!this.diseno.modoPasos || !this.diseno.pasos) return;

        if (this.pasoSimuladorActual < this.diseno.pasos.length) {

            this.pasoSimuladorActual++;

            this._cdr.markForCheck();

        } else {

            this.simuladorEnviar();

        }

    }



    simuladorPasoAnterior(): void {

        if (this.pasoSimuladorActual > 1) {

            this.pasoSimuladorActual--;

            this._cdr.markForCheck();

        }

    }



    simuladorEnviar(): void {

        this.simuladorEnviado = true;

        this._cdr.markForCheck();

    }



    reiniciarSimulador(): void {

        this.pasoSimuladorActual = 1;

        this.respuestasSimulador = {};

        this.simuladorEnviado = false;

        this._cdr.markForCheck();

    }



    // =========================================================================

    // HISTORIAL DE RESPUESTAS

    // =========================================================================



    cargarRespuestas(): void {
        this.cargandoRespuestas = true;
        this.errorCargaRespuestas = false;

        this._subRespuestas?.unsubscribe();
        this._subRespuestas = this._surveyService.obtenerRespuestasUnificadas(this.filtroTipoRespuesta)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (datos) => {
                    this.respuestasList = datos;
                    this.actualizarMetricas();
                    this.cargandoRespuestas = false;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.cargandoRespuestas = false;
                    this.errorCargaRespuestas = true;
                    this._cdr.markForCheck();
                }
            });
    }

    cambiarFiltroTipoRespuesta(tipo: 'todos' | 'producto' | 'servicio'): void {
        this.filtroTipoRespuesta = tipo;
        this.cargarRespuestas();
    }

    formatearFechaMexico(fechaUtcIso: string | null | undefined): string {
        if (!fechaUtcIso) return '—';
        const date = new Date(fechaUtcIso);
        if (isNaN(date.getTime())) return '—';
        const parts = new Intl.DateTimeFormat('es-MX', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).formatToParts(date);
        const map = new Map(parts.map(p => [p.type, p.value]));
        const day = map.get('day');
        const month = map.get('month');
        const year = map.get('year');
        const hour = map.get('hour');
        const minute = map.get('minute');
        return `${day}/${month}/${year} ${hour}:${minute}`;
    }

    get respuestasFiltradas(): EncuestaRespuestaResumenDto[] {
        return this.respuestasList.filter(r => {
            const matchesText = !this.busquedaRespuestas ||
                (r.nombre && r.nombre.toLowerCase().includes(this.busquedaRespuestas.toLowerCase())) ||
                (r.empresa && r.empresa.toLowerCase().includes(this.busquedaRespuestas.toLowerCase())) ||
                (r.email && r.email.toLowerCase().includes(this.busquedaRespuestas.toLowerCase())) ||
                (r.formularioTitulo && r.formularioTitulo.toLowerCase().includes(this.busquedaRespuestas.toLowerCase()));

            const matchesTipo = this.filtroTipoRespuesta === 'todos' || r.tipo === this.filtroTipoRespuesta;

            const matchesFormulario = this.filtroFormularioId === 'todos' ||
                (this.filtroFormularioId === 0 && r.origen === 'heredada') ||
                (r.formularioId === this.filtroFormularioId);

            return matchesText && matchesTipo && matchesFormulario;
        });
    }

    filtrarPorEncuesta(form: FormularioProductoDto): void {
        this.subTabListado = 'respuestas';
        this.filtroFormularioId = form.id;
        this.busquedaRespuestas = '';
        this._cdr.markForCheck();
    }

    contarRespuestasDeFormulario(formId: number): number {
        return this.respuestasList.filter(r => r.formularioId === formId).length;
    }

    contarRespuestasHeredadas(): number {
        return this.respuestasList.filter(r => r.origen === 'heredada').length;
    }

    abrirDetalleRespuesta(item: any): void {
        this.respuestaDetalleResumen = item;
        this.respuestaDetalleSeleccionada = item;
        this.modalDetalleAbierto = true;
        this.cargandoDetalleRespuesta = true;
        this.errorDetalleRespuesta = false;
        this.detalleRespuestaCompleto = null;

        const origen = item.origen || 'dinamica';
        const id = item.id;
        this._subDetalleRespuesta?.unsubscribe();
        this._subDetalleRespuesta = this._surveyService.obtenerDetalleRespuestaUnificada(origen, id)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (detalle) => {
                    this.detalleRespuestaCompleto = detalle;
                    this.cargandoDetalleRespuesta = false;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.errorDetalleRespuesta = true;
                    this.cargandoDetalleRespuesta = false;
                    this._cdr.markForCheck();
                }
            });
    }

    reintentarDetalleRespuesta(): void {
        if (!this.respuestaDetalleResumen) return;
        this.abrirDetalleRespuesta(this.respuestaDetalleResumen);
    }

    cerrarDetalleRespuesta(): void {
        this._subDetalleRespuesta?.unsubscribe();
        this.modalDetalleAbierto = false;
        this.respuestaDetalleResumen = null;
        this.respuestaDetalleSeleccionada = null;
        this.detalleRespuestaCompleto = null;
        this.errorDetalleRespuesta = false;
        this.cargandoDetalleRespuesta = false;
    }

    exportarRespuestasExcel(): void {
        if (this.respuestasFiltradas.length === 0) {
            this._snackBar.open('No hay respuestas para exportar', 'Cerrar', { duration: 2500 });
            return;
        }

        const headers = ['ID', 'Tipo', 'Formulario', 'Cliente', 'Empresa', 'Correo', 'Teléfono', 'Cargo', 'Calificación', 'Fecha'];
        const escapeCsv = (val: string | number | null | undefined): string => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = this.respuestasFiltradas.map(r => [
            r.origen === 'heredada' ? `H${r.id}` : `#${r.id}`,
            r.tipo || '',
            escapeCsv(r.formularioTitulo || ''),
            escapeCsv(r.nombre || ''),
            escapeCsv(r.empresa || ''),
            escapeCsv(r.email || ''),
            escapeCsv(r.telefono || ''),
            escapeCsv(r.cargo || ''),
            r.calificacion != null ? Number(r.calificacion).toFixed(1) : '',
            escapeCsv(this.formatearFechaMexico(r.fechaRegistro))
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Encuestas_Satisfaccion_Productos_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this._snackBar.open('Reporte CSV descargado con éxito', 'Cerrar', { duration: 3000 });
    }



    // =========================================================================
    // IMPORTACIÓN DESDE WORD / GOOGLE DOCS / TEXTO (IGUAL A EVENTOS)
    // =========================================================================

    modalImportarWordAbierto = false;
    metodoImportacion: 'link' | 'archivo' | 'texto' = 'link';
    urlDocumentoWord = 'https://docs.google.com/document/d/1DLdf22suIpN4s8ag-BYxmqPH31oA3iqn/edit';
    descargandoUrl = false;
    procesandoArchivoWord = false;
    archivoWordSeleccionadoNombre = '';
    textoWordParaImportar = '';
    reemplazarCamposWord = true;
    generarPasosWord = true;
    resumenWordDetectado: { secciones: number; matrices: number; opciones: number; preguntas: number; total: number } | null = null;
    camposWordPrevisualizados: CampoConfig[] = [];
    pasosWordDetectados: PasoFormularioConfig[] = [];

    get pasosDisponibles(): PasoFormularioConfig[] {
        if (!this.diseno.pasos || this.diseno.pasos.length === 0) {
            this.diseno.pasos = [
                { numero: 1, titulo: 'Datos Generales', descripcion: 'Información del evaluador' },
                { numero: 2, titulo: 'Evaluación Técnica', descripcion: 'Criterios y calidad' }
            ];
        }
        return this.diseno.pasos;
    }

    toggleModoPasos(activo: boolean): void {
        this.diseno.modoPasos = activo;
        if (activo) {
            if (!this.diseno.pasos || this.diseno.pasos.length === 0) {
                this.diseno.pasos = [
                    { numero: 1, titulo: 'Datos Generales' },
                    { numero: 2, titulo: 'Evaluación de Calidad' },
                    { numero: 3, titulo: 'Comentarios y Mejora' }
                ];
            }
            this.campos.forEach((c, idx) => {
                if (!c.paso) c.paso = idx < 4 ? 1 : 2;
            });
        }
        this._cdr.markForCheck();
    }

    agregarPaso(): void {
        if (!this.diseno.pasos) this.diseno.pasos = [];
        const nextNum = this.diseno.pasos.length + 1;
        this.diseno.pasos.push({
            numero: nextNum,
            titulo: `Paso ${nextNum}`
        });
        this._cdr.markForCheck();
    }

    eliminarPaso(numero: number): void {
        if (!this.diseno.pasos || this.diseno.pasos.length <= 1) {
            this._snackBar.open('Debe haber al menos 1 paso configurado.', 'Cerrar', { duration: 2500 });
            return;
        }
        this.diseno.pasos = this.diseno.pasos.filter(p => p.numero !== numero);
        this.diseno.pasos.forEach((p, idx) => p.numero = idx + 1);
        this.campos.forEach(c => {
            if (c.paso === numero) c.paso = 1;
            else if (c.paso && c.paso > numero) c.paso -= 1;
        });
        if (this.pasoSimuladorActual > this.diseno.pasos.length) {
            this.pasoSimuladorActual = this.diseno.pasos.length;
        }
        this._cdr.markForCheck();
    }

    // =========================================================================
    // LÓGICA CONDICIONAL Y RELACIÓN PADRE/HIJO
    // =========================================================================

    esCampoVisible(campo: CampoConfig): boolean {
        if (!campo.dependeDeCampoId) return true;
        const valorPadre = this.respuestasSimulador[campo.dependeDeCampoId];
        if (valorPadre === undefined || valorPadre === null || valorPadre === '') return false;

        const valorEsperado = (campo.dependeDeValor || '').trim().toLowerCase();
        const valorActualStr = String(valorPadre).trim().toLowerCase();

        if (campo.dependeDeOperador === 'contains') {
            return valorActualStr.includes(valorEsperado);
        }
        return valorActualStr === valorEsperado;
    }

    agregarOpcionOtroConCampo(campo: CampoConfig): void {
        if (!campo.opciones) campo.opciones = [];
        const existeOtro = campo.opciones.some(o => o.toLowerCase() === 'otro' || o.toLowerCase().startsWith('otro '));
        if (!existeOtro) {
            campo.opciones.push('Otro');
        }

        const nuevoId = 'campo_' + Date.now();
        const campoCondicional: CampoConfig = {
            id: nuevoId,
            tipo: 'input',
            etiqueta: `Especifique (si seleccionó "Otro" en ${campo.etiqueta.slice(0, 30)}...):`,
            placeholder: 'Por favor describa en detalle...',
            requerido: false,
            ancho: 'full',
            orden: campo.orden + 1,
            paso: campo.paso,
            dependeDeCampoId: campo.id,
            dependeDeOperador: 'equals',
            dependeDeValor: 'Otro'
        };

        const idxPadre = this.campos.findIndex(c => c.id === campo.id);
        if (idxPadre >= 0) {
            this.campos.splice(idxPadre + 1, 0, campoCondicional);
        } else {
            this.campos.push(campoCondicional);
        }
        this.reordenarCampos();
        this._snackBar.open('¡Campo complementario condicional vinculado a "Otro" creado!', 'Aceptar', { duration: 3000 });
        this._cdr.markForCheck();
    }

    moverCampoDebajoDePadre(campo: CampoConfig, mostrarMensaje: boolean | string = false): void {
        const padreId = typeof mostrarMensaje === 'string' ? mostrarMensaje : campo.dependeDeCampoId;
        if (!padreId) return;
        const parentIdx = this.campos.findIndex(c => c.id === padreId);
        if (parentIdx === -1) return;

        const padre = this.campos[parentIdx];
        campo.paso = padre.paso;
        if (padre.tipo === 'checkbox') {
            campo.dependeDeOperador = 'contains';
        } else if (!campo.dependeDeOperador) {
            campo.dependeDeOperador = 'equals';
        }

        const currIdx = this.campos.indexOf(campo);
        if (currIdx === -1) return;

        let targetIdx = parentIdx + 1;
        while (targetIdx < this.campos.length && this.campos[targetIdx].dependeDeCampoId === padre.id && this.campos[targetIdx].id !== campo.id) {
            targetIdx++;
        }

        if (currIdx !== targetIdx && currIdx !== targetIdx - 1) {
            this.campos.splice(currIdx, 1);
            const finalIdx = currIdx < targetIdx ? targetIdx - 1 : targetIdx;
            this.campos.splice(finalIdx, 0, campo);
            this.reordenarCampos();
            this._snackBar.open(`Pregunta reubicada justo debajo de "${padre.etiqueta}".`, 'Aceptar', { duration: 2500 });
            this._cdr.markForCheck();
        }
    }

    onCambioDependencia(campo: CampoConfig): void {
        if (!campo.dependeDeCampoId) {
            campo.dependeDeOperador = undefined;
            campo.dependeDeValor = undefined;
            this._cdr.markForCheck();
            return;
        }

        if (!campo.dependeDeOperador) campo.dependeDeOperador = 'equals';
        const padre = this.campos.find(c => c.id === campo.dependeDeCampoId);
        if (padre && padre.opciones && padre.opciones.length > 0 && !campo.dependeDeValor) {
            campo.dependeDeValor = padre.opciones[0];
        }
        if (padre && padre.paso) {
            campo.paso = padre.paso;
        }
        this._cdr.markForCheck();
    }

    obtenerOpcionesDeCampo(campoId: string): string[] {
        const c = this.campos.find(x => x.id === campoId);
        return c?.opciones || [];
    }

    obtenerCampoPorId(campoId: string): CampoConfig | undefined {
        return this.campos.find(x => x.id === campoId);
    }

    obtenerCampoHijo(padreId: string, valorOpcion?: string): CampoConfig | undefined {
        if (valorOpcion) {
            return this.campos.find(c => c.dependeDeCampoId === padreId && c.dependeDeValor === valorOpcion);
        }
        return this.campos.find(x => x.dependeDeCampoId === padreId);
    }

    // =========================================================================
    // MATRIZ LIKERT: PRESETS Y COLUMNAS
    // =========================================================================

    aplicarPresetEscala(campo: CampoConfig, preset: string): void {
        switch (preset) {
            case '1-5-na':
                campo.columnasMatriz = [
                    { valor: '1', etiqueta: '1 - Muy Malo' },
                    { valor: '2', etiqueta: '2 - Malo' },
                    { valor: '3', etiqueta: '3 - Regular' },
                    { valor: '4', etiqueta: '4 - Bueno' },
                    { valor: '5', etiqueta: '5 - Excelente' },
                    { valor: 'NA', etiqueta: 'N/A' }
                ];
                campo.escalaNotaInferior = '1 = Totalmente insatisfecho / Muy Malo';
                campo.escalaNotaSuperior = '5 = Totalmente satisfecho / Excelente';
                break;
            case '1-5':
                campo.columnasMatriz = [
                    { valor: '1', etiqueta: '1' },
                    { valor: '2', etiqueta: '2' },
                    { valor: '3', etiqueta: '3' },
                    { valor: '4', etiqueta: '4' },
                    { valor: '5', etiqueta: '5' }
                ];
                campo.escalaNotaInferior = '1 = Muy insatisfecho';
                campo.escalaNotaSuperior = '5 = Totalmente satisfecho';
                break;
            case '1-10':
                campo.columnasMatriz = Array.from({ length: 10 }, (_, i) => ({
                    valor: String(i + 1),
                    etiqueta: String(i + 1)
                }));
                campo.escalaNotaInferior = '1 = Nada probable';
                campo.escalaNotaSuperior = '10 = Muy probable';
                break;
            case '1-3':
                campo.columnasMatriz = [
                    { valor: '1', etiqueta: 'Bajo / Insatisfecho' },
                    { valor: '2', etiqueta: 'Medio / Conforme' },
                    { valor: '3', etiqueta: 'Alto / Sobresaliente' }
                ];
                campo.escalaNotaInferior = '1 = Requiere atención';
                campo.escalaNotaSuperior = '3 = Cumple totalmente';
                break;
            case 'cualitativa':
                campo.columnasMatriz = [
                    { valor: 'deficiente', etiqueta: 'Deficiente' },
                    { valor: 'regular', etiqueta: 'Regular' },
                    { valor: 'bueno', etiqueta: 'Bueno' },
                    { valor: 'excelente', etiqueta: 'Excelente' },
                    { valor: 'na', etiqueta: 'No Aplica' }
                ];
                campo.escalaNotaInferior = 'Deficiente';
                campo.escalaNotaSuperior = 'Excelente';
                break;
        }
        this._snackBar.open(`Escala "${preset}" aplicada a la matriz.`, 'Aceptar', { duration: 2500 });
        this._cdr.markForCheck();
    }

    agregarColumnaMatriz(campo: CampoConfig): void {
        if (!campo.columnasMatriz) campo.columnasMatriz = [];
        const nextIdx = campo.columnasMatriz.length + 1;
        campo.columnasMatriz.push({
            valor: `col_${nextIdx}`,
            etiqueta: `Opción ${nextIdx}`
        });
        this._cdr.markForCheck();
    }

    eliminarColumnaMatriz(campo: CampoConfig, idx: number): void {
        if (!campo.columnasMatriz || campo.columnasMatriz.length <= 1) {
            this._snackBar.open('La matriz debe tener al menos 1 columna.', 'Cerrar', { duration: 2500 });
            return;
        }
        campo.columnasMatriz.splice(idx, 1);
        this._cdr.markForCheck();
    }

    cargarPresetMatrizSatisfaccion(campo: CampoConfig): void {
        campo.filasMatriz = [
            { id: 'cumplimiento_especificaciones', texto: '1. Cumplimiento de especificaciones y calidad técnica solicitada' },
            { id: 'atencion_asesor', texto: '2. Atención, soporte técnico y asesoría por parte del equipo JR' },
            { id: 'tiempos_entrega', texto: '3. Cumplimiento con los tiempos de entrega pactados' },
            { id: 'calidad_documentacion', texto: '4. Calidad y claridad de entregables, manuales o documentación técnica' },
            { id: 'relacion_precio_valor', texto: '5. Relación precio - calidad de la solución recibida' }
        ];
        if (!campo.columnasMatriz || campo.columnasMatriz.length === 0) {
            this.aplicarPresetEscala(campo, '1-5-na');
        }
        this._snackBar.open('Aspectos de calidad JR cargados en la matriz.', 'Aceptar', { duration: 2500 });
        this._cdr.markForCheck();
    }

    cargarPlantillaSatisfaccionEtapas(): void {
        this.diseno.modoPasos = true;
        this.diseno.pasos = [
            { numero: 1, titulo: 'Datos de la Solución', descripcion: 'Identificación del cliente y equipo' },
            { numero: 2, titulo: 'Evaluación Técnica', descripcion: 'Matriz de satisfacción ISO 9001' },
            { numero: 3, titulo: 'Experiencia y Recomendación', descripcion: 'NPS, observaciones y mejora continua' }
        ];

        this.campos = [
            {
                id: 'sec_1',
                tipo: 'section',
                etiqueta: 'Paso 1: Información General del Cliente y Solución',
                placeholder: 'Datos de trazabilidad del proyecto',
                requerido: false,
                orden: 1,
                paso: 1,
                ancho: 'full'
            },
            {
                id: 'cliente_nombre',
                tipo: 'input',
                etiqueta: 'Nombre de la Empresa / Cliente',
                placeholder: 'Ej: Industrias Metálicas S.A. de C.V.',
                requerido: true,
                orden: 2,
                paso: 1,
                ancho: 'full'
            },
            {
                id: 'evaluador_contacto',
                tipo: 'input',
                etiqueta: 'Nombre y Cargo del Evaluador',
                placeholder: 'Ej: Ing. Carlos Pérez - Gerente de Planta',
                requerido: true,
                orden: 3,
                paso: 1,
                ancho: 'half'
            },
            {
                id: 'evaluador_email',
                tipo: 'email',
                etiqueta: 'Correo Electrónico de Contacto',
                placeholder: 'carlos.perez@empresa.com',
                requerido: true,
                orden: 4,
                paso: 1,
                ancho: 'half'
            },
            {
                id: 'tipo_solucion',
                tipo: 'radio',
                etiqueta: 'Tipo de Solución / Proyecto Entregado',
                opciones: ['Equipo / Tablero Fabricado', 'Servicio de Mantenimiento / Puesta en Marcha', 'Integración y Automatización PLC', 'Otro'],
                requerido: true,
                orden: 5,
                paso: 1,
                ancho: 'full'
            },
            {
                id: 'tipo_solucion_otro',
                tipo: 'input',
                etiqueta: 'Especifique el tipo de solución recibida:',
                placeholder: 'Describa el producto o servicio recibido...',
                requerido: false,
                orden: 6,
                paso: 1,
                ancho: 'full',
                dependeDeCampoId: 'tipo_solucion',
                dependeDeOperador: 'equals',
                dependeDeValor: 'Otro'
            },
            {
                id: 'sec_2',
                tipo: 'section',
                etiqueta: 'Paso 2: Evaluación Técnica y Calidad del Servicio (Escala 1 al 5)',
                placeholder: 'Califique cada aspecto con base en su experiencia',
                requerido: false,
                orden: 7,
                paso: 2,
                ancho: 'full'
            },
            {
                id: 'matriz_satisfaccion',
                tipo: 'matrix',
                etiqueta: 'Matriz de Evaluación de Calidad y Servicio JR',
                placeholder: '1 = Totalmente insatisfecho | 5 = Totalmente satisfecho | NA = No Aplica',
                requerido: true,
                orden: 8,
                paso: 2,
                ancho: 'full',
                escalaNotaInferior: '1 = Totalmente insatisfecho / Deficiente',
                escalaNotaSuperior: '5 = Totalmente satisfecho / Excelente',
                columnasMatriz: [
                    { valor: '1', etiqueta: '1 - Muy Malo' },
                    { valor: '2', etiqueta: '2 - Malo' },
                    { valor: '3', etiqueta: '3 - Regular' },
                    { valor: '4', etiqueta: '4 - Bueno' },
                    { valor: '5', etiqueta: '5 - Excelente' },
                    { valor: 'NA', etiqueta: 'N/A' }
                ],
                filasMatriz: [
                    { id: 'f1', texto: '1. Calidad y apego a especificaciones del producto / servicio entregado' },
                    { id: 'f2', texto: '2. Soporte técnico, rapidez y asesoría del equipo de ingeniería' },
                    { id: 'f3', texto: '3. Cumplimiento de los tiempos de entrega e instalación comprometidos' },
                    { id: 'f4', texto: '4. Claridad en manuales, certificados y documentación técnica entregada' },
                    { id: 'f5', texto: '5. Seguridad y orden durante las labores en campo o taller' }
                ]
            },
            {
                id: 'sec_3',
                tipo: 'section',
                etiqueta: 'Paso 3: Recomendación y Acciones de Mejora',
                placeholder: 'Su opinión es vital para nuestro proceso de mejora continua ISO 9001',
                requerido: false,
                orden: 9,
                paso: 3,
                ancho: 'full'
            },
            {
                id: 'nps_recomienda',
                tipo: 'radio',
                etiqueta: '¿Qué tan probable es que recomiende a JR Ingeniería con colegas o clientes de su industria?',
                opciones: ['10 - Definitivamente sí', '9', '8', '7', '6', '5 - Neutral', '4', '3', '2', '1 - Definitivamente no'],
                requerido: true,
                orden: 10,
                paso: 3,
                ancho: 'full'
            },
            {
                id: 'comentarios_mejora',
                tipo: 'textarea',
                etiqueta: 'Comentarios, sugerencias o áreas de oportunidad para JR Ingeniería:',
                placeholder: 'Compártanos cualquier comentario que nos ayude a seguir optimizando nuestras soluciones...',
                requerido: false,
                orden: 11,
                paso: 3,
                ancho: 'full'
            }
        ];

        this.reiniciarSimulador();
        this._snackBar.open('¡Plantilla integral (3 Pasos + Matriz 1-5 + Lógica Condicional) cargada!', 'Aceptar', { duration: 4000 });
        this._cdr.markForCheck();
    }

    // =========================================================================
    // MODAL IMPORTADOR DE WORD / DOCS / TEXTO
    // =========================================================================

    abrirModalImportarWord(): void {
        this.modalImportarWordAbierto = true;
        this.textoWordParaImportar = '';
        this.archivoWordSeleccionadoNombre = '';
        this.resumenWordDetectado = null;
        this.camposWordPrevisualizados = [];
        this.pasosWordDetectados = [];
        this._cdr.markForCheck();
    }

    cerrarModalImportarWord(): void {
        this.modalImportarWordAbierto = false;
        this._cdr.markForCheck();
    }

    cargarEjemploWord(): void {
        this.textoWordParaImportar = `SECCIÓN 1: DATOS GENERALES DEL CLIENTE
1. Nombre de la empresa o cliente evaluador *
2. Correo electrónico de contacto *
3. Teléfono de contacto
4. Tipo de producto recibido *
( ) Tablero de Control y Automatización
( ) Subestación o Transformador
( ) Servicio de Mantenimiento Preventivo
( ) Otro

5. Si seleccionó Otro, por favor especifique

SECCIÓN 2: EVALUACIÓN DE CALIDAD TÉCNICA
6. Matriz de Satisfacción del Proyecto *
[1 - Muy Malo | 2 - Malo | 3 - Regular | 4 - Bueno | 5 - Excelente | NA]
- Cumplimiento de especificaciones y pruebas de fábrica
- Tiempos de entrega y respuesta del equipo
- Soporte técnico y atención personalizada
- Calidad de documentación técnica y diagramas unifilares

SECCIÓN 3: RECOMENDACIÓN Y MEJORA CONTINUA
7. ¿Recomendaría a JR Ingeniería para futuros proyectos? *
( ) Definitivamente sí
( ) Probablemente sí
( ) Poco probable
( ) No

8. Comentarios adicionales y sugerencias de mejora`;

        this.metodoImportacion = 'texto';
        this.analizarTextoWord();
        this._cdr.markForCheck();
    }

    analizarTextoWord(): void {
        if (!this.textoWordParaImportar || !this.textoWordParaImportar.trim()) {
            this._snackBar.open('Ingresa o descarga el texto del documento para analizarlo.', 'Cerrar', { duration: 3000 });
            return;
        }

        const lineas = this.textoWordParaImportar.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const camposGenerados: CampoConfig[] = [];
        const pasosGenerados: PasoFormularioConfig[] = [];

        let pasoActual = 1;
        let campoActual: Partial<CampoConfig> | null = null;
        let idCounter = 1;

        const regexSeccion = /^(secci[oó]n|etapa|paso|bloque|m[oó]dulo)\s*([0-9ivx]*)\s*[:.-]?\s*(.*)$/i;
        const regexPregunta = /^([0-9]+|[a-z]\))\s*[\.\-\)]?\s*(.*)$/i;
        const regexOpcion = /^(\([x\s*]?\)|\[[x\s*]?\]|[-*•])\s*(.*)$/i;
        const regexMatrizEscala = /^\[(.*)\]$/;
        const regexFilaMatriz = /^[-*•]\s*(.*)$/;

        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i];

            if (regexSeccion.test(linea)) {
                if (campoActual && campoActual.etiqueta) {
                    camposGenerados.push(campoActual as CampoConfig);
                    campoActual = null;
                }

                const matchSec = linea.match(regexSeccion);
                const tituloSec = matchSec && matchSec[3] ? matchSec[3].trim() : linea;

                if (pasosGenerados.length === 0 || pasosGenerados[pasosGenerados.length - 1].titulo !== tituloSec) {
                    pasoActual = pasosGenerados.length + 1;
                    pasosGenerados.push({
                        numero: pasoActual,
                        titulo: tituloSec || `Paso ${pasoActual}`
                    });
                }

                camposGenerados.push({
                    id: `sec_${idCounter++}`,
                    tipo: 'section',
                    etiqueta: tituloSec || linea,
                    requerido: false,
                    orden: camposGenerados.length + 1,
                    paso: pasoActual,
                    ancho: 'full'
                });
                continue;
            }

            if (linea.toLowerCase().includes('matriz de') || linea.toLowerCase().includes('evaluación de aspectos') || linea.toLowerCase().includes('califique los siguientes aspectos')) {
                if (campoActual && campoActual.etiqueta) {
                    camposGenerados.push(campoActual as CampoConfig);
                }

                const requerido = linea.includes('*');
                const etiqueta = linea.replace('*', '').trim();

                campoActual = {
                    id: `matriz_${idCounter++}`,
                    tipo: 'matrix',
                    etiqueta,
                    requerido,
                    orden: camposGenerados.length + 1,
                    paso: pasoActual,
                    ancho: 'full',
                    columnasMatriz: [
                        { valor: '1', etiqueta: '1' },
                        { valor: '2', etiqueta: '2' },
                        { valor: '3', etiqueta: '3' },
                        { valor: '4', etiqueta: '4' },
                        { valor: '5', etiqueta: '5' },
                        { valor: 'NA', etiqueta: 'N/A' }
                    ],
                    filasMatriz: []
                };
                continue;
            }

            if (campoActual && campoActual.tipo === 'matrix') {
                if (regexMatrizEscala.test(linea)) {
                    const contenidoEscala = linea.replace('[', '').replace(']', '').trim();
                    const cols = contenidoEscala.split('|').map(c => c.trim()).filter(c => c.length > 0);
                    if (cols.length > 0) {
                        campoActual.columnasMatriz = cols.map((col, idx) => ({
                            valor: String(idx + 1),
                            etiqueta: col
                        }));
                    }
                    continue;
                }

                if (regexFilaMatriz.test(linea)) {
                    const matchFila = linea.match(regexFilaMatriz);
                    const textoFila = matchFila ? matchFila[1].trim() : linea;
                    if (!campoActual.filasMatriz) campoActual.filasMatriz = [];
                    campoActual.filasMatriz.push({
                        id: `f_${Date.now()}_${campoActual.filasMatriz.length + 1}`,
                        texto: textoFila
                    });
                    continue;
                }
            }

            if (regexOpcion.test(linea)) {
                const matchOp = linea.match(regexOpcion);
                const textoOpcion = matchOp ? matchOp[2].trim() : linea;

                if (!campoActual) {
                    campoActual = {
                        id: `campo_${idCounter++}`,
                        tipo: linea.startsWith('[') ? 'checkbox' : 'radio',
                        etiqueta: 'Pregunta de opción múltiple',
                        requerido: false,
                        orden: camposGenerados.length + 1,
                        paso: pasoActual,
                        ancho: 'full',
                        opciones: []
                    };
                } else if (campoActual.tipo !== 'radio' && campoActual.tipo !== 'checkbox' && campoActual.tipo !== 'select') {
                    campoActual.tipo = linea.startsWith('[') ? 'checkbox' : 'radio';
                    campoActual.opciones = [];
                }

                if (!campoActual.opciones) campoActual.opciones = [];
                campoActual.opciones.push(textoOpcion);
                continue;
            }

            if (regexPregunta.test(linea) || linea.endsWith('?') || linea.endsWith(':') || linea.includes('*')) {
                if (campoActual && campoActual.etiqueta) {
                    camposGenerados.push(campoActual as CampoConfig);
                    campoActual = null;
                }

                const matchPreg = linea.match(regexPregunta);
                let etiqueta = matchPreg ? matchPreg[2].trim() : linea;
                const requerido = etiqueta.includes('*');
                etiqueta = etiqueta.replace('*', '').trim();

                let tipoSugerido: CampoConfig['tipo'] = 'input';
                const lower = etiqueta.toLowerCase();

                if (lower.includes('correo') || lower.includes('email')) {
                    tipoSugerido = 'email';
                } else if (lower.includes('teléfono') || lower.includes('telefono') || lower.includes('whatsapp') || lower.includes('móvil') || lower.includes('celular')) {
                    tipoSugerido = 'tel';
                } else if (lower.includes('comentarios') || lower.includes('sugerencias') || lower.includes('observaciones') || lower.includes('describa') || lower.includes('detalle')) {
                    tipoSugerido = 'textarea';
                } else if (lower.includes('adjuntar') || lower.includes('archivo') || lower.includes('foto') || lower.includes('evidencia') || lower.includes('subir')) {
                    tipoSugerido = 'file';
                }

                campoActual = {
                    id: `campo_${idCounter++}`,
                    tipo: tipoSugerido,
                    etiqueta,
                    requerido,
                    orden: camposGenerados.length + 1,
                    paso: pasoActual,
                    ancho: (tipoSugerido === 'email' || tipoSugerido === 'tel') ? 'half' : 'full',
                    placeholder: tipoSugerido === 'textarea' ? 'Escriba aquí...' : ''
                };
                continue;
            }

            if (campoActual) {
                if (campoActual.tipo === 'input' && linea.length > 50) {
                    campoActual.tipo = 'textarea';
                    campoActual.placeholder = linea;
                } else if (!campoActual.placeholder) {
                    campoActual.placeholder = linea;
                }
            }
        }

        if (campoActual && campoActual.etiqueta) {
            camposGenerados.push(campoActual as CampoConfig);
        }

        if (pasosGenerados.length === 0) {
            pasosGenerados.push(
                { numero: 1, titulo: 'Datos Iniciales' },
                { numero: 2, titulo: 'Evaluación y Calidad' }
            );
        }

        this.camposWordPrevisualizados = camposGenerados;
        this.pasosWordDetectados = pasosGenerados;

        const matrices = camposGenerados.filter(c => c.tipo === 'matrix').length;
        const secciones = camposGenerados.filter(c => c.tipo === 'section').length;
        const opciones = camposGenerados.filter(c => c.tipo === 'radio' || c.tipo === 'checkbox' || c.tipo === 'select').length;
        const preguntas = camposGenerados.length - matrices - secciones;

        this.resumenWordDetectado = {
            secciones,
            matrices,
            opciones,
            preguntas,
            total: camposGenerados.length
        };

        this._snackBar.open(`¡Documento analizado con éxito! Detectados ${camposGenerados.length} componentes.`, 'Aceptar', { duration: 3500 });
        this._cdr.markForCheck();
    }

    onArchivoWordSeleccionado(event: any): void {
        const file = event.target.files?.[0];
        if (!file) return;

        this.archivoWordSeleccionadoNombre = file.name;
        this.procesandoArchivoWord = true;
        this._cdr.markForCheck();

        if (file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.procesandoArchivoWord = false;
                this.textoWordParaImportar = e.target.result || '';
                this.analizarTextoWord();
                this._cdr.markForCheck();
            };
            reader.readAsText(file);
        } else {
            this._surveyService.extraerContenidoArchivo(file)
                .pipe(takeUntil(this._destroy$))
                .subscribe({
                    next: (res) => {
                        this.procesandoArchivoWord = false;
                        this.textoWordParaImportar = res.contenido || '';
                        this.analizarTextoWord();
                        this._cdr.markForCheck();
                    },
                    error: () => {
                        this.procesandoArchivoWord = false;
                        this._snackBar.open('No se pudo procesar el archivo Word en el servidor. Puedes copiar el texto y pegarlo en la pestaña "Texto Copiado".', 'Cerrar', { duration: 4500 });
                        this._cdr.markForCheck();
                    }
                });
        }
    }

    descargarUrlGoogleDocs(): void {
        if (!this.urlDocumentoWord || !this.urlDocumentoWord.trim()) {
            this._snackBar.open('Ingresa el enlace del documento de Google Docs.', 'Cerrar', { duration: 3000 });
            return;
        }

        this.descargandoUrl = true;
        this._cdr.markForCheck();

        this._surveyService.descargarContenidoUrl(this.urlDocumentoWord.trim())
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (res) => {
                    this.descargandoUrl = false;
                    this.textoWordParaImportar = res.contenido || '';
                    this.analizarTextoWord();
                    this._snackBar.open('¡Documento descargado y analizado con éxito desde Google Docs!', 'Aceptar', { duration: 3500 });
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.descargandoUrl = false;
                    const msg = err?.error?.mensaje || 'Error al descargar el contenido del enlace. Verifica que el documento tenga permisos de acceso público o compartido.';
                    this._snackBar.open(msg, 'Cerrar', { duration: 4000 });
                    this._cdr.markForCheck();
                }
            });
    }

    confirmarImportacionWord(): void {
        if (!this.camposWordPrevisualizados || this.camposWordPrevisualizados.length === 0) {
            this._snackBar.open('Primero analiza el documento para generar los componentes.', 'Cerrar', { duration: 3000 });
            return;
        }

        if (this.reemplazarCamposWord) {
            this.campos = [...this.camposWordPrevisualizados];
        } else {
            const startOrden = this.campos.length;
            this.camposWordPrevisualizados.forEach((c, idx) => c.orden = startOrden + idx + 1);
            this.campos = [...this.campos, ...this.camposWordPrevisualizados];
        }

        if (this.generarPasosWord && this.pasosWordDetectados && this.pasosWordDetectados.length > 1) {
            this.diseno.modoPasos = true;
            this.diseno.pasos = [...this.pasosWordDetectados];
        }

        this.reordenarCampos();
        this.reiniciarSimulador();
        this.cerrarModalImportarWord();

        if (this.vistaActual === 'listado') {
            this.vistaActual = 'editor';
            this.activeTab = 'campos';
        }

        this._snackBar.open(`¡Se importaron ${this.camposWordPrevisualizados.length} preguntas correctamente!`, 'Aceptar', { duration: 3500 });
        this._cdr.markForCheck();
    }

    simuladorSeleccionarMatriz(campoId: string, filaId: string, valor: string): void {
        const key = `${campoId}_${filaId}`;
        this.respuestasSimulador[key] = valor;
        this._cdr.markForCheck();
    }

    obtenerValorMatrizSimulador(campoId: string, filaId: string): string {
        const key = `${campoId}_${filaId}`;
        return this.respuestasSimulador[key] || '';
    }

    trackByIndex(index: number): number {
        return index;
    }

    moverArriba(index: number): void {
        this.moverCampo(index, 'arriba');
    }

    moverAbajo(index: number): void {
        this.moverCampo(index, 'abajo');
    }

    onTipoCampoChange(campo: CampoConfig): void {
        if (campo.tipo === 'section') {
            // Un bloque es solo un título: no se responde. Si venía de una pregunta requerida, el interruptor «Obligatorio» queda
            // oculto y el valor se quedaba en true para siempre (la encuesta pública no dejaba avanzar).
            campo.requerido = false;
        } else if (campo.tipo === 'matrix') {
            if (!campo.columnasMatriz || campo.columnasMatriz.length === 0) {
                this.aplicarPresetEscala(campo, '1-5-na');
            }
            if (!campo.filasMatriz || campo.filasMatriz.length === 0) {
                this.cargarPresetMatrizSatisfaccion(campo);
            }
        } else if (campo.tipo === 'radio' || campo.tipo === 'select' || campo.tipo === 'checkbox') {
            if (!campo.opciones || campo.opciones.length === 0) {
                campo.opciones = ['Opción 1', 'Opción 2', 'Opción 3'];
            }
        }
        this._cdr.markForCheck();
    }

    simuladorCheckboxSeleccionado(campoId: string, opt: string): boolean {
        const val = this.respuestasSimulador[campoId];
        if (Array.isArray(val)) return val.includes(opt);
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).includes(opt);
        return false;
    }

    simuladorToggleCheckbox(campoId: string, opt: string): void {
        let current = this.respuestasSimulador[campoId];
        let arr: string[] = [];
        if (Array.isArray(current)) {
            arr = [...current];
        } else if (typeof current === 'string' && current.length > 0) {
            arr = current.split(',').map(s => s.trim());
        }
        const idx = arr.indexOf(opt);
        if (idx >= 0) {
            arr.splice(idx, 1);
        } else {
            arr.push(opt);
        }
        this.respuestasSimulador[campoId] = arr;
        this._cdr.markForCheck();
    }

    crearCampoCondicionalParaOpcion(campo: CampoConfig, opcion: string, tipo: CampoConfig['tipo'] = 'input'): void {
        const hijoExistente = this.campos.find(c => c.dependeDeCampoId === campo.id && c.dependeDeValor === opcion);
        if (hijoExistente) {
            this.moverCampoDebajoDePadre(hijoExistente, true);
            return;
        }

        const nuevoId = 'campo_' + Date.now().toString(36);
        const parentIdx = this.campos.indexOf(campo);

        const etiquetaDefault = /^otro/i.test(opcion.trim())
            ? '¿Cuál? / Especifique otro...'
            : `Especifique o detalle sobre: ${opcion}`;

        const nuevoCampo: CampoConfig = {
            id: nuevoId,
            tipo: tipo,
            etiqueta: etiquetaDefault,
            placeholder: 'Ingresa la información...',
            requerido: false,
            ancho: 'full',
            paso: campo.paso || 1,
            dependeDeCampoId: campo.id,
            dependeDeOperador: campo.tipo === 'checkbox' ? 'contains' : 'equals',
            dependeDeValor: opcion,
            orden: parentIdx + 2
        };

        let targetIdx = parentIdx + 1;
        while (targetIdx < this.campos.length && this.campos[targetIdx].dependeDeCampoId === campo.id) {
            targetIdx++;
        }

        this.campos.splice(targetIdx, 0, nuevoCampo);
        this.reordenarCampos();
        this._snackBar.open(`¡Opción "${opcion}" con campo condicional creada!`, 'Aceptar', { duration: 3000 });
        this._cdr.markForCheck();
    }

}
