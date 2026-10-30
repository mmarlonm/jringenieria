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

import { MatDialogModule } from '@angular/material/dialog';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subject, takeUntil } from 'rxjs';

import Swal from 'sweetalert2';

import {

    SurveysProductsService,

    FormularioProductoDto,

    FormularioProductoSaveDto,

    CampoConfig,

    DisenoConfig,

    PasoFormularioConfig,

    FilaMatrizConfig,

    ColumnaMatrizConfig

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

    private _destroy$ = new Subject<void>();



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

    respuestasList: any[] = [];

    cargandoRespuestas = false;

    busquedaRespuestas = '';

    filtroRespuestaFormulario: number | 'todos' = 'todos';



    // Modales

    modalQrAbierto = false;

    formularioQrSeleccionado: FormularioProductoDto | null = null;

    modalDetalleAbierto = false;

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



    tiposCampo = [

        { value: 'radio', label: 'Opción única / Calificación (Radio)', icon: 'check_circle' },

        { value: 'matrix', label: 'Matriz de Escala Likert (1 a 5)', icon: 'table_chart' },

        { value: 'select', label: 'Menú Desplegable (Select)', icon: 'arrow_drop_down_circle' },

        { value: 'checkbox', label: 'Múltiple Opción (Casillas)', icon: 'check_box' },

        { value: 'input', label: 'Texto Corto (Input)', icon: 'edit' },

        { value: 'textarea', label: 'Área de Texto (Comentarios/Párrafo)', icon: 'notes' },

        { value: 'number', label: 'Número', icon: 'tag' },

        { value: 'email', label: 'Correo Electrónico', icon: 'email' },

        { value: 'tel', label: 'Teléfono / WhatsApp', icon: 'phone' },

        { value: 'section', label: 'Separador de Sección / Título', icon: 'bookmark' }

    ];



    ngOnInit(): void {

        this.cargarListado();

        this.cargarRespuestas();

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

        this.totalRespuestasGeneral = this.formulariosList.reduce((acc, f) => acc + (f.totalRespuestas || 0), 0);

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

                }

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

                        }

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



    generarSlugAutomatico(): void {

        const base = this.titulo.toLowerCase()

            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

            .replace(/[^a-z0-9]+/g, '-')

            .replace(/^-+|-+$/g, '');

        this.slug = base || ('encuesta-' + Math.random().toString(36).substring(2, 6));

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

        if (!this.diseno.modoPasos) return this.campos;

        return this.campos.filter(c => Number(c.paso || 1) === Number(this.pasoSimuladorActual));

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

        this._surveyService.getSurveys()

            .pipe(takeUntil(this._destroy$))

            .subscribe({

                next: (res) => {

                    const datos = (res && res.code === 200 && Array.isArray(res.data)) ? res.data : [];

                    this.respuestasList = datos.map((item: any) => {

                        const scorePromedio = this.calcularScorePromedioLegacy(item);

                        return {

                            ...item,

                            scorePromedio

                        };

                    });

                    this.cargandoRespuestas = false;

                    this._cdr.markForCheck();

                },

                error: () => {

                    this.cargandoRespuestas = false;

                    this._cdr.markForCheck();

                }

            });

    }



    calcularScorePromedioLegacy(item: any): number {

        const scores = [

            item.servicioPersonal,

            item.recomendarProductos,

            item.ayudaProducto,

            item.comprensionNecesidades,

            item.tiempoEntrega

        ].filter(x => typeof x === 'number' && !isNaN(x));



        if (scores.length === 0) return 9.0;

        const sum = scores.reduce((a, b) => a + b, 0);

        return Math.round((sum / scores.length) * 10) / 10;

    }



    get respuestasFiltradas(): any[] {

        return this.respuestasList.filter(r => {

            const matchesText = !this.busquedaRespuestas ||

                (r.nombre && r.nombre.toLowerCase().includes(this.busquedaRespuestas.toLowerCase())) ||

                (r.empresa && r.empresa.toLowerCase().includes(this.busquedaRespuestas.toLowerCase())) ||

                (r.email && r.email.toLowerCase().includes(this.busquedaRespuestas.toLowerCase())) ||

                (r.proyectoNombre && r.proyectoNombre.toLowerCase().includes(this.busquedaRespuestas.toLowerCase()));



            const rTipo = r.tipo || (r.proyectoNombre ? 'servicio' : 'producto');

            const matchesTipo = this.filtroTipoRespuesta === 'todos' || rTipo === this.filtroTipoRespuesta;



            return matchesText && matchesTipo;

        });

    }



    abrirDetalleRespuesta(item: any): void {

        this.respuestaDetalleSeleccionada = item;

        this.modalDetalleAbierto = true;

    }



    cerrarDetalleRespuesta(): void {

        this.modalDetalleAbierto = false;

        this.respuestaDetalleSeleccionada = null;

    }



    exportarRespuestasExcel(): void {

        if (this.respuestasFiltradas.length === 0) {

            this._snackBar.open('No hay respuestas para exportar', 'Cerrar', { duration: 2500 });

            return;

        }



        const headers = ['ID', 'Cliente', 'Empresa', 'Email', 'Teléfono', 'Cargo', 'Servicio Personal', 'Recomendar NPS', 'Ayuda Producto', 'Comprensión', 'Tiempo Entrega', 'Comentarios', 'Fecha'];

        const rows = this.respuestasFiltradas.map(r => [

            r.id,

            `"${(r.nombre || '').replace(/"/g, '""')}"`,

            `"${(r.empresa || '').replace(/"/g, '""')}"`,

            `"${(r.email || '').replace(/"/g, '""')}"`,

            `"${(r.telefono || '').replace(/"/g, '""')}"`,

            `"${(r.cargo || '').replace(/"/g, '""')}"`,

            r.servicioPersonal ?? '',

            r.recomendarProductos ?? '',

            r.ayudaProducto ?? '',

            r.comprensionNecesidades ?? '',

            r.tiempoEntrega ?? '',

            `"${(r.razonServicio || '').replace(/"/g, '""')}"`,

            `"${r.fechaRegistro || ''}"`

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

        this._snackBar.open('Reporte CSV descargado con éxito', 'Cerrar', { duration: 3000 });

    }

}

