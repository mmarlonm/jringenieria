import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from 'environments/environment';
import { EventosService, EventoEdicion, Asistente } from '../eventos.service';
import {
    FormularioRegistroService,
    CampoConfig,
    DisenoConfig,
    FilaMatrizConfig,
    ColumnaMatrizConfig,
    PasoFormularioConfig,
    FormularioRegistroAdminDto,
    EnvioMasivoFormularioRequestDto,
    EnvioMasivoResultadoDto,
    FormularioEnvioHistorialDto,
    DestinatarioItemEnvioDto
} from './formulario-registro.service';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import { PersonalStaffService, PersonalStaff } from '../personal-staff/personal-staff.service';

@Component({
    selector: 'app-configurador-registro',
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
        MatSnackBarModule
    ],
    templateUrl: './configurador-registro.component.html',
    styleUrls: ['./configurador-registro.component.scss']
})
export class ConfiguradorRegistroComponent implements OnInit, OnDestroy {
    private _http = inject(HttpClient);
    private _eventosService = inject(EventosService);
    private _formService = inject(FormularioRegistroService);
    private _usersService = inject(UsersService);
    private _staffService = inject(PersonalStaffService);
    private _snackBar = inject(MatSnackBar);
    private _cdr = inject(ChangeDetectorRef);
    private _route = inject(ActivatedRoute);
    private _destroy$ = new Subject<void>();

    // Control de vista: 'listado' de formularios o 'editor' de un formulario
    vistaActual: 'listado' | 'editor' = 'listado';

    // Listado de Formularios
    formulariosList: FormularioRegistroAdminDto[] = [];
    cargandoListado = false;
    busquedaListado = '';
    filtroEventoId: number | 'todos' = 'todos';
    formularioAEliminar: FormularioRegistroAdminDto | null = null;
    copiadoFormId: number | null = null;

    // Estados Editor
    loading = false;
    saving = false;
    activeTab: 'general' | 'campos' | 'diseno' | 'enlace' | 'respuestas' = 'general';
    previewDevice: 'desktop' | 'tablet' | 'mobile' = 'desktop';

    // Eventos disponibles
    eventos: EventoEdicion[] = [];
    selectedEventoId: number | null = null;
    currentFormId = 0;

    // Configuración General
    titulo = 'Registro al Evento';
    descripcion = 'Completa tus datos para confirmar tu participación y obtener tu pase de acceso.';
    slug = '';
    imagenPortadaUrl = 'assets/eventos/foro-energiza-logo.png';
    moduloDestino: 'Asistentes' | 'Staff' | 'Expositores' | 'PersonalInterno' | string = 'Asistentes';
    activo = true;
    totalRespuestas = 0;

    // Listados de Personas del Módulo Destino Seleccionado
    asistentesList: Asistente[] = [];
    staffList: PersonalStaff[] = [];
    expositoresList: PersonalStaff[] = [];
    usuariosCrmList: any[] = [];
    cargandoPersonasModulo = false;
    busquedaPersonas = '';
    subTabRespuestas: 'personas' | 'respuestas' = 'personas';

    // Modal de Envío Masivo
    modalEnvioMasivoAbierto = false;
    formularioParaEnvio: FormularioRegistroAdminDto | null = null;
    cargandoDestinatariosEnvio = false;
    destinatariosParaEnvio: any[] = [];
    destinatariosSeleccionadosIds: Set<string | number> = new Set();
    busquedaDestinatariosEnvio = '';
    asuntoEnvio = '';
    mensajeAdicionalEnvio = '';
    enviandoMasivo = false;
    resultadoEnvio: EnvioMasivoResultadoDto | null = null;
    historialEnviosMap: Map<string, FormularioEnvioHistorialDto> = new Map();
    filtroSeleccionRapida: 'todos' | 'personalizado' | 'sin-enviar' | 'sin-respuesta' = 'todos';

    // Campos Dinámicos
    campos: CampoConfig[] = [];

    // Modal y Estado de Importación desde Word / Google Docs
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

    // Opciones de tipo de campo
    tiposCampo = [
        { value: 'input', label: 'Texto corto (Input)', icon: 'heroicons_outline:pencil' },
        { value: 'email', label: 'Correo electrónico', icon: 'heroicons_outline:envelope' },
        { value: 'tel', label: 'Teléfono / WhatsApp', icon: 'heroicons_outline:phone' },
        { value: 'number', label: 'Número', icon: 'heroicons_outline:hashtag' },
        { value: 'select', label: 'Menú desplegable (Select)', icon: 'heroicons_outline:chevron-down' },
        { value: 'radio', label: 'Opción única (Radio)', icon: 'heroicons_outline:check-circle' },
        { value: 'checkbox', label: 'Múltiple opción (Checkbox)', icon: 'heroicons_outline:squares-2x2' },
        { value: 'matrix', label: 'Tabla / Matriz Escala (1 a 5)', icon: 'heroicons_outline:table-cells' },
        { value: 'section', label: 'Bloque / Separador de Sección', icon: 'heroicons_outline:bookmark-square' },
        { value: 'textarea', label: 'Área de texto (Párrafo)', icon: 'heroicons_outline:bars-3-bottom-left' },
        { value: 'file', label: 'Subir Archivo / Fotografía', icon: 'heroicons_outline:photo' }
    ];

    // Campos estándar sugeridos para mapeo automático al Asistente
    camposEstandar = [
        { value: '', label: 'Personalizado (Sin mapeo especial)' },
        { value: 'Nombre', label: 'Nombre del asistente' },
        { value: 'Apellidos', label: 'Apellidos del asistente' },
        { value: 'CorreoElectronico', label: 'Correo electrónico' },
        { value: 'NumeroTelefonico', label: 'Teléfono / WhatsApp' },
        { value: 'EmpresaRepresenta', label: 'Empresa / Procedencia' },
        { value: 'TipoAsistente', label: 'Tipo (General / Estudiante)' },
        { value: 'OcupacionCargo', label: 'Cargo / Ocupación' },
        { value: 'DireccionCiudadEstado', label: 'Ciudad / Estado de origen' },
        { value: 'UniversidadRepresentas', label: 'Universidad (Estudiantes)' },
        { value: 'CarreraCursas', label: 'Carrera / Especialidad' },
        { value: 'FotoPerfil', label: 'Fotografía (Staff/Expositor)' },
        { value: 'EsAlergicoAlimento', label: '¿Alergias a alimentos?' },
        { value: 'AlergiaCual', label: '¿Cuáles alergias?' }
    ];

    // Configuración de Diseño y Pasos (Wizard)
    diseno: DisenoConfig = {
        tipoFormulario: 'Registro',
        modoPasos: false,
        pasos: [
            { numero: 1, titulo: 'Paso 1: Datos Generales' },
            { numero: 2, titulo: 'Paso 2: Evaluación' }
        ],
        colorPrimario: '#1e8449',
        colorFondo: '#0f172a',
        estiloCard: 'solid',
        radioBorde: 'rounded-2xl',
        alturaPortada: 'medium',
        botonTexto: 'Confirmar mi Registro',
        mensajeExito: '¡Tu registro ha sido confirmado exitosamente! Te esperamos en el evento.',
        mostrarQrExito: true,
        temaOscuro: false
    };

    // Control de paso en simulador interactivo
    pasoSimuladorActual = 1;

    /** Cambia el tipo de formulario y ajusta automáticamente la generación de QR y textos */
    onTipoFormularioChange(tipo: 'Registro' | 'Satisfaccion'): void {
        this.diseno.tipoFormulario = tipo;
        if (tipo === 'Satisfaccion') {
            // En encuestas de satisfacción NUNCA se genera ni muestra código QR
            this.diseno.mostrarQrExito = false;
            if (!this.diseno.botonTexto || this.diseno.botonTexto === 'Confirmar mi Registro') {
                this.diseno.botonTexto = 'Enviar Encuesta';
            }
            if (!this.diseno.mensajeExito || this.diseno.mensajeExito.includes('¡Tu registro ha sido confirmado exitosamente!')) {
                this.diseno.mensajeExito = '¡Muchas gracias por tus respuestas! Tu opinión es fundamental para nosotros.';
            }
            if (this.titulo === 'Registro al Evento' || this.titulo.startsWith('Registro —')) {
                const nombreEv = this.eventos.find(e => e.id === this.selectedEventoId)?.nombre || 'Evento';
                this.titulo = `Encuesta de Satisfacción — ${nombreEv}`;
            }
        } else {
            this.diseno.mostrarQrExito = true;
            if (this.diseno.botonTexto === 'Enviar Encuesta') {
                this.diseno.botonTexto = 'Confirmar mi Registro';
            }
            if (this.diseno.mensajeExito.includes('¡Muchas gracias por tus respuestas!')) {
                this.diseno.mensajeExito = '¡Tu registro ha sido confirmado exitosamente! Te esperamos en el evento.';
            }
        }
        this._cdr.markForCheck();
    }

    /** Helper para obtener el tipo de formulario en el listado */
    obtenerTipoFormulario(form: FormularioRegistroAdminDto): 'Registro' | 'Satisfaccion' {
        if (!form?.disenoConfigJson) return 'Registro';
        try {
            const config = JSON.parse(form.disenoConfigJson);
            return config.tipoFormulario === 'Satisfaccion' ? 'Satisfaccion' : 'Registro';
        } catch {
            return 'Registro';
        }
    }

    // Paletas predefinidas de colores
    paletasColores = [
        { nombre: 'Verde Energiza', color: '#1e8449' },
        { nombre: 'Azul Eléctrico', color: '#0284c7' },
        { nombre: 'Índigo Tech', color: '#6366f1' },
        { nombre: 'Ámbar Energía', color: '#f59e0b' },
        { nombre: 'Violeta Futurista', color: '#8b5cf6' },
        { nombre: 'Esmeralda Pro', color: '#059669' },
        { nombre: 'Rojo Pasión', color: '#dc2626' },
        { nombre: 'Negro Elegante', color: '#18181b' }
    ];

    // Presets de portadas rápidas
    portadasPresets = [
        { nombre: 'Foro Energiza Banner', url: 'assets/eventos/foro-energiza-logo.png' },
        { nombre: 'Ingeniería Tech', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80' },
        { nombre: 'Conferencia & Networking', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80' },
        { nombre: 'Energía Renovable', url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&auto=format&fit=crop&q=80' }
    ];

    // Preview simulador - respuestas interactivas
    previewRespuestas: { [key: string]: any } = {};

    // Respuestas registradas (modo consulta)
    respuestasEvento: any[] = [];
    cargandoRespuestas = false;

    ngOnInit(): void {
        this.cargarEventos();
        this.cargarListadoFormularios();

        // Escuchar flujo reactivo de asistentes
        this._eventosService.asistentes$
            .pipe(takeUntil(this._destroy$))
            .subscribe(list => {
                this.asistentesList = list || [];
                if (this.moduloDestino === 'Asistentes') {
                    this.cargandoPersonasModulo = false;
                    this._cdr.markForCheck();
                }
            });

        // Parámetros por URL para navegación directa (ej. ?id=5 o ?eventoId=2 o ?modo=editor)
        this._route.queryParams.pipe(takeUntil(this._destroy$)).subscribe(params => {
            if (params['id']) {
                const idNum = Number(params['id']);
                if (idNum > 0) {
                    this.cargarFormularioPorId(idNum);
                }
            } else if (params['eventoId']) {
                const evId = Number(params['eventoId']);
                if (evId > 0) {
                    this.selectedEventoId = evId;
                    this.cargarFormularioPorEvento(evId);
                    this.vistaActual = 'editor';
                }
            } else if (params['modo'] === 'editor') {
                this.vistaActual = 'editor';
            }
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    /** Carga listado completo de todos los formularios configurados en el sistema */
    cargarListadoFormularios(): void {
        this.cargandoListado = true;
        this._formService.getTodos()
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (data) => {
                    this.formulariosList = data || [];
                    this.cargandoListado = false;
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.cargandoListado = false;
                    console.error('Error al cargar listado de formularios:', err);
                    this._cdr.markForCheck();
                }
            });
    }

    /** Filtrado dinámico de formularios por texto y evento */
    get formulariosFiltrados(): FormularioRegistroAdminDto[] {
        let list = this.formulariosList;

        if (this.filtroEventoId !== 'todos' && this.filtroEventoId !== null) {
            list = list.filter(f => f.eventoId === Number(this.filtroEventoId));
        }

        if (this.busquedaListado && this.busquedaListado.trim() !== '') {
            const term = this.busquedaListado.toLowerCase().trim();
            list = list.filter(f =>
                (f.titulo && f.titulo.toLowerCase().includes(term)) ||
                (f.nombreEvento && f.nombreEvento.toLowerCase().includes(term)) ||
                (f.slug && f.slug.toLowerCase().includes(term)) ||
                (f.descripcion && f.descripcion.toLowerCase().includes(term))
            );
        }

        return list;
    }

    /** Métricas globales para badges del listado */
    get totalRegistrosGeneral(): number {
        return this.formulariosList.reduce((acc, f) => acc + (f.totalRespuestas || 0), 0);
    }

    get totalActivosGeneral(): number {
        return this.formulariosList.filter(f => f.activo).length;
    }

    /** Inicia la creación de un nuevo formulario */
    nuevoFormulario(): void {
        this.currentFormId = 0;
        if (this.eventos.length > 0) {
            const ev = this.eventos[0];
            this.selectedEventoId = ev.id;
            const slugSugerido = this.generarSlug(ev.nombre + ' ' + (ev.anio || ''));
            this.inicializarPlantillaEstandar(ev.nombre, slugSugerido);
        } else {
            this.inicializarPlantillaEstandar('Evento', 'registro-evento');
        }
        this.activeTab = 'general';
        this.vistaActual = 'editor';
        this._cdr.markForCheck();
    }

    /** Abre un formulario existente para edición */
    editarFormulario(form: FormularioRegistroAdminDto): void {
        this.cargarFormularioDesdeDto(form);
        this.activeTab = 'general';
        this.vistaActual = 'editor';
        this._cdr.markForCheck();
    }

    /** Carga un formulario en el editor a partir de su DTO */
    cargarFormularioDesdeDto(form: FormularioRegistroAdminDto): void {
        this.currentFormId = form.id;
        this.selectedEventoId = form.eventoId;
        this.titulo = form.titulo || 'Registro al Evento';
        this.descripcion = form.descripcion || '';
        this.slug = form.slug;
        this.imagenPortadaUrl = form.imagenPortadaUrl || 'assets/eventos/foro-energiza-logo.png';
        this.activo = form.activo;
        this.moduloDestino = (form.moduloDestino || 'Asistentes').trim();
        this.totalRespuestas = form.totalRespuestas || 0;

        try {
            this.campos = JSON.parse(form.camposConfigJson || '[]');
        } catch {
            this.campos = [];
        }

        try {
            this.diseno = { ...this.diseno, ...JSON.parse(form.disenoConfigJson || '{}') };
        } catch {
            // Conservar defaults
        }

        this.inicializarPreviewRespuestas();
        this.cargarPersonasModuloDestino();
        this._cdr.markForCheck();
    }

    /** Carga un formulario por su ID desde el backend */
    cargarFormularioPorId(id: number): void {
        this.loading = true;
        this._formService.getPorId(id)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (form) => {
                    this.loading = false;
                    if (form) {
                        this.cargarFormularioDesdeDto(form);
                        this.vistaActual = 'editor';
                    }
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.loading = false;
                    this.mostrarAlerta('No se pudo encontrar el formulario especificado.');
                    this.vistaActual = 'listado';
                    this._cdr.markForCheck();
                }
            });
    }

    /** Ir directo a la pestaña de respuestas del formulario */
    verRespuestasDesdeListado(form: FormularioRegistroAdminDto): void {
        this.cargarFormularioDesdeDto(form);
        this.activeTab = 'respuestas';
        this.cargarRespuestas();
        this.vistaActual = 'editor';
        this._cdr.markForCheck();
    }

    /** Regresa a la vista del listado de formularios */
    volverAlListado(): void {
        this.vistaActual = 'listado';
        this.cargarListadoFormularios();
        this._cdr.markForCheck();
    }

    /** Prepara eliminación con confirmación */
    solicitarEliminar(form: FormularioRegistroAdminDto, event?: MouseEvent): void {
        if (event) event.stopPropagation();
        this.formularioAEliminar = form;
    }

    cancelarEliminar(): void {
        this.formularioAEliminar = null;
    }

    confirmarEliminar(): void {
        if (!this.formularioAEliminar) return;
        const id = this.formularioAEliminar.id;
        const titulo = this.formularioAEliminar.titulo;
        this._formService.eliminar(id)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: () => {
                    this.mostrarAlerta(`Formulario «${titulo}» eliminado exitosamente.`);
                    this.formularioAEliminar = null;
                    this.cargarListadoFormularios();
                },
                error: (err) => {
                    const msg = err?.error?.mensaje || 'Error al eliminar el formulario.';
                    this.mostrarAlerta(msg);
                    this.formularioAEliminar = null;
                }
            });
    }

    /** Copia la URL pública del formulario al portapapeles */
    copiarEnlaceListado(form: FormularioRegistroAdminDto, event?: MouseEvent): void {
        if (event) event.stopPropagation();
        let pathname = window.location.pathname;
        if (!pathname.endsWith('/')) pathname += '/';
        const url = `${window.location.origin}${pathname}#/eventos/registro/${form.slug}`;
        navigator.clipboard.writeText(url);
        this.copiadoFormId = form.id;
        setTimeout(() => {
            if (this.copiadoFormId === form.id) {
                this.copiadoFormId = null;
                this._cdr.markForCheck();
            }
        }, 2500);
        this.mostrarAlerta('¡Enlace público copiado al portapapeles!');
    }

    /** Abre la URL pública del formulario en una nueva pestaña */
    abrirEnlaceListado(slug: string, event?: MouseEvent): void {
        if (event) event.stopPropagation();
        let pathname = window.location.pathname;
        if (!pathname.endsWith('/')) pathname += '/';
        window.open(`${window.location.origin}${pathname}#/eventos/registro/${slug}`, '_blank');
    }

    /** Cuenta preguntas válidas en el JSON */
    contarCampos(jsonStr: string): number {
        try {
            const arr = JSON.parse(jsonStr || '[]');
            return Array.isArray(arr) ? arr.length : 0;
        } catch {
            return 0;
        }
    }

    /** Obtiene nombre y año de un evento */
    obtenerNombreEvento(eventoId: number): string {
        const ev = this.eventos.find(e => e.id === eventoId);
        return ev ? `${ev.nombre} (${ev.anio})` : `Evento #${eventoId}`;
    }

    /** Carga catálogo de eventos disponibles */
    cargarEventos(): void {
        this._eventosService.getEventosCompletos()
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (list) => {
                    const mapped: EventoEdicion[] = (list || []).map(e => ({
                        id: e.id,
                        nombre: e.nombreNovedad || e.nombre || 'Evento',
                        anio: e.anio || new Date().getFullYear()
                    }));
                    this.eventos = mapped;
                    if (this.eventos.length > 0 && !this.selectedEventoId) {
                        this.selectedEventoId = this.eventos[0].id;
                    }
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    console.error('Error al cargar eventos:', err);
                }
            });
    }

    /** Carga o inicializa la configuración del formulario del evento seleccionado */
    cargarFormularioPorEvento(eventoId: number): void {
        this.loading = true;
        this.currentFormId = 0;
        this.selectedEventoId = eventoId;

        const eventoSeleccionado = this.eventos.find(e => e.id === eventoId);
        const slugSugerido = eventoSeleccionado
            ? this.generarSlug(eventoSeleccionado.nombre + ' ' + (eventoSeleccionado.anio || ''))
            : 'registro-evento';

        this._formService.getPorEvento(eventoId)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (form) => {
                    this.loading = false;
                    if (form) {
                        this.currentFormId = form.id;
                        this.titulo = form.titulo || 'Registro al Evento';
                        this.descripcion = form.descripcion || '';
                        this.slug = form.slug || slugSugerido;
                        this.imagenPortadaUrl = form.imagenPortadaUrl || 'assets/eventos/foro-energiza-logo.png';
                        this.activo = form.activo;
                        this.totalRespuestas = form.totalRespuestas || 0;

                        try {
                            this.campos = JSON.parse(form.camposConfigJson || '[]');
                        } catch {
                            this.campos = [];
                        }

                        try {
                            this.diseno = { ...this.diseno, ...JSON.parse(form.disenoConfigJson || '{}') };
                        } catch {
                            // Usar valores por defecto
                        }
                    } else {
                        // Formulario nuevo: inicializar con plantilla estándar recomendada
                        this.inicializarPlantillaEstandar(eventoSeleccionado?.nombre || 'Evento', slugSugerido);
                    }

                    this.inicializarPreviewRespuestas();
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.loading = false;
                    this.inicializarPlantillaEstandar(eventoSeleccionado?.nombre || 'Evento', slugSugerido);
                    this.inicializarPreviewRespuestas();
                    this._cdr.markForCheck();
                }
            });
    }

    /** Inicializa plantilla con campos comunes recomendados */
    inicializarPlantillaEstandar(nombreEvento: string, slugSugerido: string): void {
        this.currentFormId = 0;
        this.titulo = `Registro — ${nombreEvento}`;
        this.descripcion = 'Completa tus datos para confirmar tu participación y recibir tu gafete de acceso.';
        this.slug = slugSugerido;
        this.imagenPortadaUrl = 'assets/eventos/foro-energiza-logo.png';
        this.activo = true;
        this.totalRespuestas = 0;

        this.campos = [
            {
                id: 'campo_nombre',
                tipo: 'input',
                etiqueta: 'Nombre completo',
                placeholder: 'Ingresa tu nombre y apellidos',
                requerido: true,
                ancho: 'full',
                campoEstandar: 'Nombre',
                orden: 1
            },
            {
                id: 'campo_email',
                tipo: 'email',
                etiqueta: 'Correo electrónico',
                placeholder: 'ejemplo@correo.com',
                requerido: true,
                ancho: 'half',
                campoEstandar: 'CorreoElectronico',
                orden: 2
            },
            {
                id: 'campo_telefono',
                tipo: 'tel',
                etiqueta: 'Número telefónico / WhatsApp',
                placeholder: '10 dígitos',
                requerido: true,
                ancho: 'half',
                campoEstandar: 'NumeroTelefonico',
                orden: 3
            },
            {
                id: 'campo_tipo',
                tipo: 'radio',
                etiqueta: '¿Con qué perfil asistes?',
                placeholder: '',
                requerido: true,
                ancho: 'full',
                campoEstandar: 'TipoAsistente',
                opciones: ['Público General / Empresario', 'Estudiante / Académico', 'Expositor / Patrocinador'],
                orden: 4
            },
            {
                id: 'campo_empresa',
                tipo: 'input',
                etiqueta: 'Empresa o Institución de donde nos visitas',
                placeholder: 'Nombre de tu empresa, escuela u organización',
                requerido: false,
                ancho: 'full',
                campoEstandar: 'EmpresaRepresenta',
                orden: 5
            },
            {
                id: 'campo_difusion',
                tipo: 'select',
                etiqueta: '¿Cómo te enteraste del evento?',
                placeholder: 'Selecciona una opción',
                requerido: false,
                ancho: 'half',
                opciones: ['Redes Sociales (Facebook/LinkedIn)', 'Invitación Directa / Amigo', 'Página Web Oficial', 'Radio o Prensa'],
                orden: 6
            },
            {
                id: 'campo_comentarios',
                tipo: 'textarea',
                etiqueta: '¿Qué temas o actividades te interesan más?',
                placeholder: 'Cuéntanos qué esperas de esta edición...',
                requerido: false,
                ancho: 'full',
                orden: 7
            }
        ];
    }

    /** Inicializa valores de prueba para la previsualización interactiva */
    inicializarPreviewRespuestas(): void {
        this.previewRespuestas = {};
        this.campos.forEach(c => {
            if (c.tipo === 'checkbox') {
                this.previewRespuestas[c.id] = [];
            } else if (c.tipo === 'matrix') {
                this.previewRespuestas[c.id] = {};
            } else {
                this.previewRespuestas[c.id] = '';
            }
        });
    }

    /** Lista segura de pasos disponibles */
    get pasosDisponibles(): PasoFormularioConfig[] {
        if (!this.diseno.pasos || this.diseno.pasos.length === 0) {
            this.diseno.pasos = [
                { numero: 1, titulo: 'Paso 1: Datos Generales' },
                { numero: 2, titulo: 'Paso 2: Evaluación' }
            ];
        }
        return this.diseno.pasos;
    }

    /** Activa o desactiva la navegación por pasos */
    toggleModoPasos(activo: boolean): void {
        this.diseno.modoPasos = activo;
        if (activo) {
            if (!this.diseno.pasos || this.diseno.pasos.length === 0) {
                this.diseno.pasos = [
                    { numero: 1, titulo: 'Paso 1: Datos Generales' },
                    { numero: 2, titulo: 'Paso 2: Evaluación' }
                ];
            }
            // Asegurar que todos los campos tengan un paso asignado (por defecto 1)
            this.campos.forEach(c => {
                if (!c.paso || c.paso < 1) c.paso = 1;
            });
            this.pasoSimuladorActual = 1;
        }
        this._cdr.markForCheck();
    }

    /** Agrega un nuevo paso al formulario */
    agregarPaso(): void {
        if (!this.diseno.pasos) this.diseno.pasos = [];
        const nuevoNum = this.diseno.pasos.length + 1;
        this.diseno.pasos.push({
            numero: nuevoNum,
            titulo: `Paso ${nuevoNum}: Nueva Sección`,
            descripcion: ''
        });
        this.pasoSimuladorActual = nuevoNum;
        this._cdr.markForCheck();
    }

    /** Elimina un paso y reasigna sus campos */
    eliminarPaso(numero: number): void {
        if (!this.diseno.pasos || this.diseno.pasos.length <= 1) {
            this.mostrarAlerta('Debe existir al menos un paso en el formulario.');
            return;
        }

        // Reasignar campos del paso eliminado al paso 1 o anterior
        this.campos.forEach(c => {
            if (c.paso === numero) {
                c.paso = 1;
            } else if (c.paso && c.paso > numero) {
                c.paso = c.paso - 1;
            }
        });

        this.diseno.pasos = this.diseno.pasos
            .filter(p => p.numero !== numero)
            .map((p, idx) => ({ ...p, numero: idx + 1 }));

        if (this.pasoSimuladorActual > this.diseno.pasos.length) {
            this.pasoSimuladorActual = this.diseno.pasos.length;
        }
        this._cdr.markForCheck();
    }

    /** Navegación entre pasos en el simulador */
    cambiarPasoSimulador(pasoNum: number): void {
        this.pasoSimuladorActual = pasoNum;
        this._cdr.markForCheck();
    }

    avanzarPasoSimulador(): void {
        if (this.pasoSimuladorActual < this.pasosDisponibles.length) {
            this.pasoSimuladorActual++;
            this._cdr.markForCheck();
        }
    }

    retrocederPasoSimulador(): void {
        if (this.pasoSimuladorActual > 1) {
            this.pasoSimuladorActual--;
            this._cdr.markForCheck();
        }
    }

    /** Verifica si un campo pertenece al paso visible en el simulador */
    esCampoDePasoSimulador(campo: CampoConfig): boolean {
        if (!this.diseno.modoPasos) return true;
        const pasoCampo = campo.paso || 1;
        return pasoCampo === this.pasoSimuladorActual;
    }

    /** Helper para crear columnas por defecto de matriz (Escala 1 al 5 y N/A) */
    crearColumnasDefaultMatriz(): ColumnaMatrizConfig[] {
        return [
            { valor: '1', etiqueta: '1' },
            { valor: '2', etiqueta: '2' },
            { valor: '3', etiqueta: '3' },
            { valor: '4', etiqueta: '4' },
            { valor: '5', etiqueta: '5' },
            { valor: 'NA', etiqueta: 'N/A' }
        ];
    }

    /** Helper para crear filas por defecto de aspectos a evaluar */
    crearFilasDefaultMatriz(): FilaMatrizConfig[] {
        return [
            { id: 'f_org', texto: 'Organización general del evento' },
            { id: 'f_atn', texto: 'Atención y comunicación previa al evento' },
            { id: 'f_inst', texto: 'Instalaciones y señalización de espacios' },
            { id: 'f_conf', texto: 'Conferencias, paneles y talleres' }
        ];
    }

    /** Agrega fila a una matriz */
    agregarFilaMatriz(campo: CampoConfig): void {
        if (!campo.filasMatriz) campo.filasMatriz = [];
        const id = 'f_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4);
        campo.filasMatriz.push({
            id: id,
            texto: `Aspecto a evaluar ${campo.filasMatriz.length + 1}`
        });
        this._cdr.markForCheck();
    }

    eliminarFilaMatriz(campo: CampoConfig, index: number): void {
        if (!campo.filasMatriz) return;
        campo.filasMatriz.splice(index, 1);
        this._cdr.markForCheck();
    }

    /** Agrega columna a una matriz */
    agregarColumnaMatriz(campo: CampoConfig): void {
        if (!campo.columnasMatriz) campo.columnasMatriz = [];
        const num = campo.columnasMatriz.length + 1;
        campo.columnasMatriz.push({ valor: `${num}`, etiqueta: `${num}` });
        this._cdr.markForCheck();
    }

    eliminarColumnaMatriz(campo: CampoConfig, index: number): void {
        if (!campo.columnasMatriz) return;
        campo.columnasMatriz.splice(index, 1);
        this._cdr.markForCheck();
    }

    /** Carga preset rápido de matriz con aspectos basados en el cuestionario de Foro Energiza */
    cargarPresetMatrizSatisfaccion(campo: CampoConfig): void {
        campo.etiqueta = '4. SATISFACCIÓN CON EL EVENTO';
        campo.placeholder = 'Marca una opción por cada aspecto: 1 = Muy insatisfecho(a) · 2 = Insatisfecho(a) · 3 = Neutral · 4 = Satisfecho(a) · 5 = Muy satisfecho(a)';
        campo.escalaNotaInferior = '1 = Muy insatisfecho(a)';
        campo.escalaNotaSuperior = '5 = Muy satisfecho(a)';
        campo.columnasMatriz = this.crearColumnasDefaultMatriz();
        campo.filasMatriz = [
            { id: 'm_org_gen', texto: 'Organización general del evento' },
            { id: 'm_atn_prev', texto: 'Atención y comunicación previa al evento' },
            { id: 'm_proc_reg', texto: 'Proceso de registro como participante / expositor' },
            { id: 'm_mont_stand', texto: 'Montaje y condiciones de espacios / stands' },
            { id: 'm_ubic_stand', texto: 'Ubicación y señalización de espacios' },
            { id: 'm_atn_staff', texto: 'Atención del equipo y personal de apoyo' },
            { id: 'm_act_prog', texto: 'Actividades y programa del evento' },
            { id: 'm_conf_tall', texto: 'Conferencias, paneles y talleres' },
            { id: 'm_netw_com', texto: 'Oportunidades de networking y contactos comerciales' },
            { id: 'm_log_oper', texto: 'Logística, operación y puntualidad durante el evento' }
        ];
        this.mostrarAlerta('¡Aspectos de satisfacción cargados en la tabla!');
        this._cdr.markForCheck();
    }

    /** Maneja la selección en el simulador para una celda de matriz */
    seleccionarMatrizPreview(campoId: string, filaId: string, valor: string): void {
        if (!this.previewRespuestas[campoId] || typeof this.previewRespuestas[campoId] !== 'object' || Array.isArray(this.previewRespuestas[campoId])) {
            this.previewRespuestas[campoId] = {};
        }
        this.previewRespuestas[campoId][filaId] = valor;
        this._cdr.markForCheck();
    }

    /** Aplica un preset rápido a la escala / columnas de la matriz */
    aplicarPresetEscala(campo: CampoConfig, preset: '1-5-na' | '1-5' | '1-10' | '1-3' | 'cualitativa'): void {
        if (preset === '1-5-na') {
            campo.columnasMatriz = [
                { valor: '1', etiqueta: '1' },
                { valor: '2', etiqueta: '2' },
                { valor: '3', etiqueta: '3' },
                { valor: '4', etiqueta: '4' },
                { valor: '5', etiqueta: '5' },
                { valor: 'NA', etiqueta: 'N/A' }
            ];
            campo.escalaNotaInferior = '1 = Muy insatisfecho(a)';
            campo.escalaNotaSuperior = '5 = Muy satisfecho(a)';
        } else if (preset === '1-5') {
            campo.columnasMatriz = [
                { valor: '1', etiqueta: '1' },
                { valor: '2', etiqueta: '2' },
                { valor: '3', etiqueta: '3' },
                { valor: '4', etiqueta: '4' },
                { valor: '5', etiqueta: '5' }
            ];
            campo.escalaNotaInferior = '1 = Menor calificación';
            campo.escalaNotaSuperior = '5 = Mayor calificación';
        } else if (preset === '1-10') {
            campo.columnasMatriz = Array.from({ length: 10 }, (_, i) => ({
                valor: `${i + 1}`,
                etiqueta: `${i + 1}`
            }));
            campo.escalaNotaInferior = '1 = Pésimo';
            campo.escalaNotaSuperior = '10 = Excelente';
        } else if (preset === '1-3') {
            campo.columnasMatriz = [
                { valor: '1', etiqueta: '1' },
                { valor: '2', etiqueta: '2' },
                { valor: '3', etiqueta: '3' }
            ];
            campo.escalaNotaInferior = '1 = Bajo';
            campo.escalaNotaSuperior = '3 = Alto';
        } else if (preset === 'cualitativa') {
            campo.columnasMatriz = [
                { valor: 'muy_malo', etiqueta: 'Muy Malo' },
                { valor: 'malo', etiqueta: 'Malo' },
                { valor: 'regular', etiqueta: 'Regular' },
                { valor: 'bueno', etiqueta: 'Bueno' },
                { valor: 'excelente', etiqueta: 'Excelente' }
            ];
            campo.escalaNotaInferior = 'Muy Malo';
            campo.escalaNotaSuperior = 'Excelente';
        }
        this.mostrarAlerta(`Escala "${preset}" aplicada a la tabla.`);
        this._cdr.markForCheck();
    }

    /** Abre el modal de importación de Word */
    abrirModalImportarWord(): void {
        this.modalImportarWordAbierto = true;
        this.resumenWordDetectado = null;
        this.camposWordPrevisualizados = [];
        this.pasosWordDetectados = [];
        if (!this.textoWordParaImportar) {
            this.cargarEjemploWord();
        }
        this._cdr.markForCheck();
    }

    cerrarModalImportarWord(): void {
        this.modalImportarWordAbierto = false;
        this._cdr.markForCheck();
    }

    cargarEjemploWord(): void {
        this.textoWordParaImportar = `ENCUESTA DE SATISFACCIÓN | EXPOSITORES
Foro Energiza 2026
Estimado expositor: Gracias por ser parte de Foro Energiza 2026. Tu opinión es muy importante para nosotros. Responder esta encuesta te tomará solo unos minutos.

1. DATOS GENERALES
Nombre de la empresa:
Nombre del representante (empezando por apellidos):
Giro o sector de tu empresa: Gráfico de barras horizontales
☐ Industrial     ☐ Comercial     ☐ Manufacturero     ☐ Servicios
☐ Energía / Eléctrico     ☐ Construcción     ☐ Otro

2. ¿CÓMO TE ENTERASTE DE FORO ENERGIZA 2026? Gráfico de Barras Horizontales
☐ Invitación por cámaras o asociaciones
☐ Invitación por empresas privadas
☐ Invitación directa de JR Ingeniería Eléctrica
☐ Recomendación de un colega / amigo 
☐ Redes sociales
☐ Correo electrónico
☐ Otro

3. EXPERIENCIA GENERAL 
¿Cómo calificas tu experiencia general como expositor en Foro Energiza 2026? Gráfico de Barras Horizontales
1 | Muy mala
2 | Mala
3 | Regular
4 | Buena
5 | Excelente

4. SATISFACCIÓN CON EL EVENTO Mapa de calor o barras apiladas divergentes.
Marca una opción por cada aspecto: 1 = Muy insatisfecho(a) · 2 = Insatisfecho(a) · 3 = Neutral · 4 = Satisfecho(a) · 5 = Muy satisfecho(a)
Aspecto
Organización general del evento
Atención y comunicación previa al evento
Proceso de registro como expositor
Montaje y condiciones del stand
Ubicación del stand
Señalización y distribución de espacios
Atención del equipo de Foro Energiza
Actividades y programa del evento
Conferencias, paneles y talleres
Oportunidades de networking
Oportunidades para generar contactos comerciales
Mesas de negocio B2B
Logística y operación durante el evento

5. VALOR PARA TU EMPRESA
¿Consideras que la participación en Foro Energiza 2026 generó valor para tu empresa? Barras horizontales
☐ Sí, mucho     ☐ Sí, en buena medida     ☐ Regular     ☐ Poco     ☐ No

¿Cuántos prospectos comerciales obtuviste durante Foro Energiza 2026? Barras horizontales
☐ 0     ☐ 1–2     ☐ 3–5     ☐ Más de 5

¿Lograste cerrar alguna venta o negocio como resultado de tu participación en Foro Energiza 2026? Barras horizontales
☐ Sí, 1 venta o negocio     ☐ Sí, 2 ventas o negocios     ☐ Más de 2     ☐ No, pero tengo prospectos en seguimiento     ☐ No

¿Qué beneficios obtuvo tu empresa al participar? Barras horizontales ordenadas de mayor a menor.
Puedes seleccionar más de una opción.
☐ Generación de nuevos contactos
☐ Prospectos comerciales
☐ Networking
☐ Visibilidad de marca
☐ Presentación de productos o servicios
☐ Relaciones con otras empresas
☐ Relaciones con instituciones y asociaciones
☐ Oportunidades de negocio

6. RETROALIMENTACIÓN
¿Qué fue lo que más valoraste de tu participación como expositor?
¿Qué aspecto consideras que podemos mejorar para próximas ediciones?
¿Qué actividades o servicios te gustaría encontrar en futuras ediciones de Foro Energiza?

PARTICIPACIÓN FUTURA
¿Participarías nuevamente como expositor en Foro Energiza? barra apilada al 100%.
☐ Sí     ☐ Probablemente sí     ☐ Tal vez     ☐ Probablemente no     ☐ No

¿Recomendarías Foro Energiza a otras empresas como espacio para participar o exponer? barra apilada al 100%.
☐ Sí     ☐ Probablemente sí     ☐ Tal vez     ☐ Probablemente no     ☐ No

7. COMENTARIOS O SUGERENCIAS ADICIONALES`;
        this._cdr.markForCheck();
    }

    /** Analiza el texto estructurado de Word y genera componentes visuales dinámicos */
    analizarTextoWord(): void {
        if (!this.textoWordParaImportar || !this.textoWordParaImportar.trim()) {
            this.mostrarAlerta('Ingresa o pega el texto del documento Word para analizar.');
            return;
        }

        const rawLines = this.textoWordParaImportar
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0 && !/^_{3,}$/.test(l));

        const camposGenerados: CampoConfig[] = [];
        const pasosGenerados: PasoFormularioConfig[] = [];

        let pasoActualNum = 1;
        let primerPreguntaEtapasId = '';
        let etapasOpciones: string[] = [];
        let seccionesCount = 0;
        let matricesCount = 0;
        let opcionesCount = 0;
        let preguntasCount = 0;

        const limpiarNotas = (txt: string): string => {
            return txt
                .replace(/\s*(Gr[aá]fico de barras.*|Gráfica de barras.*|Barras horizontales.*|Barras por.*|Barras comparativas.*|Mapa de calor.*|barra apilada.*|Barra apilada.*|Clasificaci[oó]n tem[aá]tica.*|Comparaci[oó]n de temas.*|Resumen tem[aá]tico.*)\s*$/gi, '')
                .replace(/(\s*(Respuesta\s+(corta|abierta)\.?|Opcional\.?))+$/gi, '')
                .replace(/_{3,}/g, '')
                .trim();
        };

        const limpiarOpcion = (opt: string): string => {
            return opt
                .replace(/_{3,}/g, '')
                .replace(/^Otro:\s*$/i, 'Otro')
                .replace(/^Otro:\s*_{2,}/i, 'Otro')
                .replace(/:\s*$/, '')
                .trim();
        };

        // Algoritmo inteligente para relacionar bloques con la etapa seleccionada en la encuesta
        const encontrarMejorEtapaMatch = (titSeccion: string, etapas: string[]): string | null => {
            if (!etapas || etapas.length === 0) return null;
            const limTit = titSeccion.replace(/^BLOQUE\s+\d+[\.:\s]*/i, '').toLowerCase().trim();
            const palabrasTit = limTit.split(/[^a-záéíóú0-9]+/).filter(w => w.length > 2);
            const esPrevia = limTit.includes('previa') || limTit.includes('preparaci');

            let mejorMatch: string | null = null;
            let mejorScore = -999;

            for (const etapa of etapas) {
                const limEtapa = etapa.toLowerCase();
                const etapaEsPrevia = limEtapa.includes('previa') || limEtapa.includes('organizaci');

                if (esPrevia && !etapaEsPrevia) continue;
                if (!esPrevia && etapaEsPrevia) continue;

                const palabrasEtapa = limEtapa.split(/[^a-záéíóú0-9]+/).filter(w => w.length > 2);
                let score = 0;
                for (const p of palabrasTit) {
                    if (palabrasEtapa.includes(p)) score += 10;
                }
                if (score > mejorScore && score > 0) {
                    mejorScore = score;
                    mejorMatch = etapa;
                }
            }

            if (mejorMatch) return mejorMatch;

            for (const etapa of etapas) {
                const limEtapa = etapa.toLowerCase();
                if (limEtapa.includes(limTit) || limTit.includes(limEtapa)) {
                    return etapa;
                }
            }
            return null;
        };

        // 1. Título y Descripción inicial del Formulario
        let i = 0;
        if (rawLines.length > 2 && /ENCUESTA|REGISTRO|CUESTIONARIO|EVALUACI[OÓ]N/i.test(rawLines[0])) {
            const tit = rawLines[0] + (rawLines[1] && !/^(\d+\.|Estimado|BLOQUE|Esta evaluaci)/i.test(rawLines[1]) ? ' - ' + rawLines[1] : '');
            this.titulo = tit;
            const descParts: string[] = [];
            let j = (rawLines[1] && !/^(\d+\.|Estimado|BLOQUE|Esta evaluaci)/i.test(rawLines[1])) ? 2 : 1;
            while (j < rawLines.length && !/^(\d+\.\s+[A-ZÁÉÍÓÚÑ]|BLOQUE|SECCI[OÓ]N|PARTICIPACI[OÓ]N)/i.test(rawLines[j])) {
                descParts.push(rawLines[j]);
                j++;
            }
            if (descParts.length > 0) {
                this.descripcion = descParts.join(' ');
            }
            i = j;
        }

        pasosGenerados.push({
            numero: 1,
            titulo: 'Paso 1: Inicio',
            descripcion: 'Información inicial del formulario'
        });

        while (i < rawLines.length) {
            const linea = rawLines[i];

            // Omitir texto de cierre / agradecimiento final
            if (/^¡GRACIAS|FORO ENERGIZA 2026$|Conectando industria|Tu opini[oó]n nos ayuda a construir/i.test(linea)) {
                i++;
                continue;
            }

            // A. DETECCIÓN DE BLOQUE / SECCIÓN
            const esBloqueExplicit = /^(BLOQUE\s+\d+|SECCI[OÓ]N\s+\d+|PARTICIPACI[OÓ]N FUTURA)/i.test(linea);
            const esTituloEnMayusculas = /^\d+\.\s+[A-ZÁÉÍÓÚÑ\s]{4,}$/.test(linea) && !linea.includes('?') && !linea.includes('¿');
            const esEncabezadoBloque = (esBloqueExplicit || esTituloEnMayusculas) && !linea.startsWith('☐') && !linea.startsWith('•') && !linea.startsWith('○');

            if (esEncabezadoBloque) {
                seccionesCount++;
                const titSeccion = limpiarNotas(linea);

                if (camposGenerados.length > 0 && this.generarPasosWord) {
                    pasoActualNum++;
                    const pasoTitulo = titSeccion
                        .replace(/^BLOQUE\s+\d+[\.:\s]*/i, '')
                        .replace(/^\d+\.\s*/, '')
                        .trim();
                    pasosGenerados.push({
                        numero: pasoActualNum,
                        titulo: `Paso ${pasoActualNum}: ${pasoTitulo.charAt(0).toUpperCase() + pasoTitulo.slice(1).toLowerCase()}`,
                        descripcion: 'Sección del cuestionario'
                    });
                }

                const secCampo: CampoConfig = {
                    id: 'sec_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                    tipo: 'section',
                    etiqueta: titSeccion,
                    placeholder: 'Completa la información correspondiente a este paso.',
                    requerido: false,
                    ancho: 'full',
                    paso: pasoActualNum,
                    orden: camposGenerados.length + 1
                };

                // Condicionalidad automática si corresponde a una etapa seleccionada
                if (primerPreguntaEtapasId && etapasOpciones.length > 0) {
                    const etapaMatch = encontrarMejorEtapaMatch(titSeccion, etapasOpciones);
                    if (etapaMatch) {
                        secCampo.dependeDeCampoId = primerPreguntaEtapasId;
                        if (/^BLOQUE\s+\d+\.\s+FORO ENERGIZA$/i.test(titSeccion.trim())) {
                            secCampo.dependeDeValor = 'Foro Energiza';
                        } else {
                            secCampo.dependeDeValor = etapaMatch;
                        }
                        secCampo.dependeDeOperador = 'contains';
                    }
                }

                camposGenerados.push(secCampo);

                // Saltar nota informativa debajo del bloque si existe
                i++;
                if (i < rawLines.length && /^Este bloque se responde|Solo aparece si|Responde únicamente/i.test(rawLines[i])) {
                    secCampo.placeholder = rawLines[i];
                    i++;
                }

                // Si es bloque de comentarios sin preguntas explícitas debajo
                if (/COMENTARIOS|SUGERENCIAS/i.test(titSeccion) && (i >= rawLines.length || /^¡GRACIAS/i.test(rawLines[i]))) {
                    preguntasCount++;
                    camposGenerados.push({
                        id: 'cp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                        tipo: 'textarea',
                        etiqueta: 'Comentarios o sugerencias adicionales',
                        placeholder: 'Escribe aquí cualquier comentario adicional o recomendación para el evento...',
                        requerido: false,
                        ancho: 'full',
                        paso: pasoActualNum,
                        orden: camposGenerados.length + 1
                    });
                }

                continue;
            }

            // B. DETECCIÓN DE MATRIZ LIKERT / TABLA DE EVALUACIÓN
            const esMatrizInicio = /SATISFACCI[OÓ]N|EVALUACI[OÓ]N\s+(DE\s+LA|COMPARATIVA|GENERAL|CON)|¿C[oó]mo evaluar[ií]as la (organizaci[oó]n|claridad|comunicaci[oó]n)|¿Cómo evaluarías (la organización|la claridad|la comunicación)/i.test(linea) ||
                /Marca una opci[oó]n por cada aspecto|¿Qu[ée] tan satisfecho/i.test(linea);

            if (esMatrizInicio && (i + 1 < rawLines.length && (/Aspecto|Actividad|Qué evaluar|1\s*=\s*Muy|1\s*–\s*5|[1-5]/i.test(rawLines[i + 1]) || /Aspecto|Actividad/i.test(rawLines[i + 2] || '')))) {
                matricesCount++;
                let etiquetaMatriz = limpiarNotas(linea).replace(/^\d+\.\s*/, '');
                let placeholderMatriz = '';
                i++;

                let tieneNA = false;
                let tieneNoParticipe = false;

                if (i < rawLines.length && (/Marca una opci|1\s*=\s*Muy|Escala:/i.test(rawLines[i]))) {
                    placeholderMatriz = rawLines[i];
                    i++;
                }

                // Detectar columnas y saltar cabeceras de tabla
                while (i < rawLines.length && /^(Aspecto|Actividad|Qué evaluar|[1-5]|N\/A|No participé|\t)+$/i.test(rawLines[i])) {
                    if (/N\/A/i.test(rawLines[i])) tieneNA = true;
                    if (/No participé/i.test(rawLines[i])) tieneNoParticipe = true;
                    i++;
                }

                const filasMatriz: FilaMatrizConfig[] = [];
                while (i < rawLines.length) {
                    const lFila = rawLines[i];
                    if (/^(BLOQUE|\d+\.\s+[A-ZÁÉÍÓÚÑ¿¡]|SECCI[OÓ]N|PARTICIPACI[OÓ]N)/i.test(lFila) && !/^[○☐]/.test(lFila)) break;
                    if (/^(Aspecto|Actividad|Qué evaluar|[1-5]|N\/A|No participé|☐|○|\t)+$/i.test(lFila.trim())) {
                        if (/N\/A/i.test(lFila)) tieneNA = true;
                        if (/No participé/i.test(lFila)) tieneNoParticipe = true;
                        i++;
                        continue;
                    }
                    if (/^Escala:/i.test(lFila)) {
                        placeholderMatriz = lFila;
                        i++;
                        break;
                    }

                    const textoLimpio = lFila.replace(/^(\d+[\.\-\|\)]|\•|\-|\*)\s*/, '').trim();
                    if (textoLimpio.length > 2 && !textoLimpio.startsWith('☐') && !textoLimpio.startsWith('○')) {
                        let descFila = '';
                        if (i + 1 < rawLines.length && !/^[☐○\d]/.test(rawLines[i + 1]) && !/^(BLOQUE|\d+\.)/i.test(rawLines[i + 1])) {
                            descFila = ' (' + rawLines[i + 1] + ')';
                            i++;
                        }
                        filasMatriz.push({
                            id: 'f_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4) + filasMatriz.length,
                            texto: textoLimpio + descFila
                        });
                    }
                    i++;
                }

                if (filasMatriz.length === 0) {
                    filasMatriz.push(...this.crearFilasDefaultMatriz());
                }

                const columnasMatriz: ColumnaMatrizConfig[] = [
                    { valor: '1', etiqueta: '1' },
                    { valor: '2', etiqueta: '2' },
                    { valor: '3', etiqueta: '3' },
                    { valor: '4', etiqueta: '4' },
                    { valor: '5', etiqueta: '5' }
                ];
                if (tieneNA) {
                    columnasMatriz.push({ valor: 'NA', etiqueta: 'N/A' });
                } else if (tieneNoParticipe) {
                    columnasMatriz.push({ valor: 'No participe', etiqueta: 'No participé' });
                }

                const matrizCampo: CampoConfig = {
                    id: 'matriz_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                    tipo: 'matrix',
                    etiqueta: etiquetaMatriz,
                    placeholder: placeholderMatriz || 'Marca una opción por cada aspecto evaluado.',
                    requerido: false,
                    ancho: 'full',
                    paso: pasoActualNum,
                    escalaNotaInferior: '1 = Muy insatisfecho(a) / deficiente',
                    escalaNotaSuperior: '5 = Muy satisfecho(a) / excelente',
                    columnasMatriz: columnasMatriz,
                    filasMatriz: filasMatriz,
                    orden: camposGenerados.length + 1
                };

                camposGenerados.push(matrizCampo);
                continue;
            }

            // C. DETECCIÓN DE PREGUNTA CON ESCALA NUMÉRICA O NPS
            // Caso C1: 1 a 5 con opciones en líneas
            if ((linea.includes('?') || linea.includes('¿')) && i + 1 < rawLines.length && /^[1-5]$/.test(rawLines[i + 1])) {
                preguntasCount++;
                const etiquetaPregunta = limpiarNotas(linea).replace(/^\d+\.\s*/, '');
                i++;
                while (i < rawLines.length && /^[1-5]$/.test(rawLines[i])) i++;
                while (i < rawLines.length && /^[☐○]+$/.test(rawLines[i])) i++;
                if (i < rawLines.length && /Muy mala.*Excelente/i.test(rawLines[i])) i++;

                const opcionesEscala = ['1 | Muy mala', '2 | Mala', '3 | Regular', '4 | Buena', '5 | Excelente'];
                opcionesCount += opcionesEscala.length;

                camposGenerados.push({
                    id: 'cp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                    tipo: 'radio',
                    etiqueta: etiquetaPregunta,
                    placeholder: 'Selecciona tu nivel de calificación del 1 al 5',
                    requerido: true,
                    ancho: 'full',
                    paso: pasoActualNum,
                    opciones: opcionesEscala,
                    orden: camposGenerados.length + 1
                });
                continue;
            }

            // Caso C2: Pregunta seguida de "1–5", "Escala 1–5." o "Barras comparativas1–5"
            const tieneEscalaSiguiente = i + 1 < rawLines.length && /^(\s*1\s*–\s*5\.?|Escala\s*1[–-]5\.?)/i.test(rawLines[i + 1]);
            const tieneEscalaEnLinea = /1\s*–\s*5$/i.test(linea);

            if ((linea.includes('?') || linea.includes('¿') || /^\d+\.\s+/.test(linea)) && (tieneEscalaSiguiente || tieneEscalaEnLinea)) {
                preguntasCount++;
                const etiquetaPregunta = limpiarNotas(linea).replace(/^\d+\.\s*/, '').replace(/1\s*–\s*5$/i, '').trim();
                if (tieneEscalaSiguiente) i++;
                i++;

                const opcionesEscala = ['1 (Muy bajo)', '2 (Bajo)', '3 (Medio)', '4 (Bueno)', '5 (Excelente)'];
                opcionesCount += opcionesEscala.length;

                camposGenerados.push({
                    id: 'cp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                    tipo: 'radio',
                    etiqueta: etiquetaPregunta,
                    placeholder: 'Selecciona tu nivel de calificación del 1 al 5',
                    requerido: true,
                    ancho: 'full',
                    paso: pasoActualNum,
                    opciones: opcionesEscala,
                    orden: camposGenerados.length + 1
                });
                continue;
            }

            // Caso C3: Pregunta de NPS 0 a 10
            if (/escala del 0 al 10|recomiendes Foro Energiza/i.test(linea)) {
                preguntasCount++;
                const etiquetaPregunta = limpiarNotas(linea).replace(/^\d+\.\s*/, '');
                i++;
                if (i < rawLines.length && /0 significa|Selecciona un solo número/i.test(rawLines[i])) {
                    i++;
                }
                while (i < rawLines.length && /^(☐\s*)?([0-9]|10)$/.test(rawLines[i])) {
                    i++;
                }
                const opcionesNps = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
                opcionesCount += opcionesNps.length;

                camposGenerados.push({
                    id: 'cp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                    tipo: 'radio',
                    etiqueta: etiquetaPregunta,
                    placeholder: 'Selecciona una puntuación del 0 al 10',
                    requerido: true,
                    ancho: 'full',
                    paso: pasoActualNum,
                    opciones: opcionesNps,
                    orden: camposGenerados.length + 1
                });
                continue;
            }

            // D. PREGUNTAS ESTÁNDAR
            const lineaLimpiaNotas = limpiarNotas(linea);
            const esPregunta = (linea.includes('?') || linea.includes('¿') || /^\d+\.\s+[A-ZÁÉÍÓÚÑ]/.test(linea) ||
                (lineaLimpiaNotas.endsWith(':') && !linea.startsWith('☐') && !linea.startsWith('○') && !/^Otro:/i.test(lineaLimpiaNotas)));

            if (esPregunta) {
                preguntasCount++;
                const etiquetaPregunta = lineaLimpiaNotas.replace(/^\d+\.\s*/, '');
                i++;

                let subinstruccion = '';
                if (i < rawLines.length && !rawLines[i].includes('?') && !rawLines[i].includes('¿') &&
                    !(limpiarNotas(rawLines[i]).endsWith(':') && !rawLines[i].startsWith('☐') && !rawLines[i].startsWith('○') && !/^Otro:/i.test(rawLines[i])) &&
                    !/^\d+\.\s+/.test(rawLines[i]) &&
                    /Selecciona|Marca|Puedes seleccionar|hasta tres|todas las que correspondan|Respuesta abierta|Esta pregunta es fundamental/i.test(rawLines[i]) &&
                    !/^(\•|\-|\*|☐|○)/.test(rawLines[i])) {
                    subinstruccion = rawLines[i];
                    i++;
                }

                const esAbiertaExplicita = /Respuesta abierta|Clasificaci[oó]n tem[aá]tica|Gráfica de temas|Comparación de temas/i.test(linea + ' ' + subinstruccion) ||
                    (i < rawLines.length && /^Respuesta abierta/i.test(rawLines[i]));

                if (esAbiertaExplicita) {
                    if (i < rawLines.length && /^Respuesta abierta/i.test(rawLines[i])) i++;
                    camposGenerados.push({
                        id: 'cp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                        tipo: 'textarea',
                        etiqueta: etiquetaPregunta,
                        placeholder: subinstruccion || 'Escribe tu respuesta aquí...',
                        requerido: false,
                        ancho: 'full',
                        paso: pasoActualNum,
                        orden: camposGenerados.length + 1
                    });
                    continue;
                }

                // Recopilar opciones (con checkboxes ☐/○ o líneas de texto plano)
                const opciones: string[] = [];
                while (i < rawLines.length) {
                    const lOpt = rawLines[i];
                    const lOptLimpia = limpiarNotas(lOpt);

                    if (/^(BLOQUE|\d+\.\s+[A-ZÁÉÍÓÚÑ¿¡]|SECCI[OÓ]N|PARTICIPACI[OÓ]N)/i.test(lOpt)) break;
                    if (lOpt.includes('?') || lOpt.includes('¿')) break;
                    if (/^SATISFACCI|^\s*1\s*–\s*5/i.test(lOpt)) break;
                    if (/^Respuesta abierta/i.test(lOpt)) break;

                    // Si es el inicio de otra pregunta que termina en ':'
                    if (!lOpt.includes('☐') && !lOpt.includes('○') && !/^Otro:/i.test(lOptLimpia) && lOptLimpia.endsWith(':')) {
                        break;
                    }

                    if (lOpt.includes('☐') || lOpt.includes('○')) {
                        const splitted = lOpt.split(/[☐○]/).map(limpiarOpcion).filter(o => o.length > 0);
                        opciones.push(...splitted);
                        i++;
                    } else if (/^(\•|\-|\*|\d+\))\s*/.test(lOpt)) {
                        const optTexto = lOpt.replace(/^(\•|\-|\*|\d+\))\s*/, '').trim();
                        if (optTexto.length > 0) opciones.push(limpiarOpcion(optTexto));
                        i++;
                    } else if (/^\d+\s*\|\s*/.test(lOpt)) {
                        const optTexto = lOpt.replace(/^\d+\s*\|\s*/, '').trim();
                        if (optTexto.length > 0) opciones.push(limpiarOpcion(optTexto));
                        i++;
                    } else {
                        // Opciones de texto plano (ej: Sí, No, opciones sin checkboxes)
                        const esOpcionPlano = lOpt.length >= 2 && lOpt.length < 90 &&
                            !/^(Este bloque|Solo aparece|Responde únicamente|Opcional\.)/i.test(lOpt) &&
                            !/^(1\s*=\s*Muy|[1-5]\s*\|\s*)/i.test(lOpt);

                        if (esOpcionPlano) {
                            opciones.push(limpiarOpcion(lOpt));
                            i++;
                        } else {
                            break;
                        }
                    }
                }

                const esSeleccionMultiple = /todas las que correspondan|hasta tres|checkbox|m[uú]ltiple|etapas|puedes seleccionar|beneficios/i.test(etiquetaPregunta + ' ' + subinstruccion);
                const esTextArea = /sugerencia|comentario|mejorar|valoraste|gustar[ií]a encontrar|actividades que|hizo falta|funcion[oó] bien|deber[ií]amos|raz[oó]n de la calificaci[oó]n|dificultades/i.test(etiquetaPregunta);
                const esInput = etiquetaPregunta.endsWith(':') || /Nombre completo|representas\?|Nombre de|Nombre del/i.test(etiquetaPregunta);

                let tipoFinal: CampoConfig['tipo'] = 'radio';
                if (esTextArea && opciones.length === 0) {
                    tipoFinal = 'textarea';
                } else if (esInput && opciones.length === 0) {
                    tipoFinal = 'input';
                } else if (esSeleccionMultiple) {
                    tipoFinal = 'checkbox';
                } else if (opciones.length === 0) {
                    tipoFinal = /correo|email/i.test(etiquetaPregunta) ? 'email' : (/tel[ée]fono|whatsapp/i.test(etiquetaPregunta) ? 'tel' : 'input');
                }

                if (opciones.length > 0) opcionesCount += opciones.length;

                const campoNuevo: CampoConfig = {
                    id: 'cp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
                    tipo: tipoFinal,
                    etiqueta: etiquetaPregunta,
                    placeholder: subinstruccion || (tipoFinal === 'textarea' ? 'Escribe tu respuesta aquí...' : 'Ingresa la información...'),
                    requerido: esSeleccionMultiple || tipoFinal === 'radio',
                    ancho: 'full',
                    paso: pasoActualNum,
                    opciones: opciones.length > 0 ? opciones : undefined,
                    orden: camposGenerados.length + 1
                };

                if (/etapas\s+participaste/i.test(etiquetaPregunta) && !primerPreguntaEtapasId) {
                    primerPreguntaEtapasId = campoNuevo.id;
                    etapasOpciones = opciones.slice();
                }

                camposGenerados.push(campoNuevo);
                continue;
            }

            i++;
        }

        this.camposWordPrevisualizados = camposGenerados;
        this.pasosWordDetectados = pasosGenerados.length > 1 ? pasosGenerados : [
            { numero: 1, titulo: 'Paso 1: Inicio y Registro' },
            { numero: 2, titulo: 'Paso 2: Evaluación' }
        ];

        this.resumenWordDetectado = {
            secciones: seccionesCount,
            matrices: matricesCount,
            opciones: opcionesCount,
            preguntas: preguntasCount,
            total: camposGenerados.length
        };

        this.mostrarAlerta(`¡Análisis completado! Se detectaron ${camposGenerados.length} componentes en ${this.pasosWordDetectados.length} pasos listos para importar.`);
        this._cdr.markForCheck();
    }

    /** Descarga y analiza automáticamente el documento desde la URL (Google Docs o web) */
    importarDesdeUrl(): void {
        if (!this.urlDocumentoWord || !this.urlDocumentoWord.trim()) {
            this.mostrarAlerta('Ingresa el enlace de Google Docs o documento web.');
            return;
        }

        this.descargandoUrl = true;
        this._cdr.markForCheck();

        this._formService.descargarContenidoUrl(this.urlDocumentoWord.trim())
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (res) => {
                    this.descargandoUrl = false;
                    this.textoWordParaImportar = res.contenido || '';
                    this.analizarTextoWord();
                    this.mostrarAlerta('¡Documento descargado y analizado con éxito desde el enlace!');
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.descargandoUrl = false;
                    const msg = err?.error?.mensaje || 'Error al descargar el contenido del enlace. Verifica que el documento tenga permisos de acceso público o compartido.';
                    this.mostrarAlerta(msg);
                    this._cdr.markForCheck();
                }
            });
    }

    /** Aplica los campos analizados del Word al formulario */
    confirmarImportacionWord(): void {
        if (!this.camposWordPrevisualizados || this.camposWordPrevisualizados.length === 0) {
            this.mostrarAlerta('Primero haz clic en "Analizar Documento" o selecciona una fuente.');
            return;
        }

        // Si se importa desde el listado, cambiar automáticamente a vista de editor
        if (this.vistaActual === 'listado') {
            this.currentFormId = 0;
            this.selectedEventoId = this.eventos.length > 0 ? this.eventos[0].id : 0;
            this.slug = this.generarSlug(this.titulo || 'encuesta-satisfaccion');
            this.activeTab = 'campos';
            this.vistaActual = 'editor';
        }

        if (this.reemplazarCamposWord) {
            this.campos = [...this.camposWordPrevisualizados];
        } else {
            const startOrden = this.campos.length;
            this.camposWordPrevisualizados.forEach((c, idx) => {
                c.orden = startOrden + idx + 1;
                this.campos.push(c);
            });
        }

        if (this.generarPasosWord && this.pasosWordDetectados.length > 1) {
            this.diseno.modoPasos = true;
            this.diseno.pasos = [...this.pasosWordDetectados];
            this.pasoSimuladorActual = 1;
        }

        this.diseno.tipoFormulario = 'Satisfaccion';
        this.diseno.mostrarQrExito = false;
        this.diseno.botonTexto = 'Enviar Encuesta';

        this.inicializarPreviewRespuestas();
        this.reordenarCampos();
        this.cerrarModalImportarWord();
        this.mostrarAlerta(`¡Éxito! Se han importado ${this.camposWordPrevisualizados.length} preguntas y tablas.`);
        this._cdr.markForCheck();
    }

    /** Permite subir un archivo .txt o .docx directamente */
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
            // Archivo .docx: enviamos al backend para extracción limpia por ZipArchive
            this._formService.extraerContenidoArchivo(file)
                .pipe(takeUntil(this._destroy$))
                .subscribe({
                    next: (res) => {
                        this.procesandoArchivoWord = false;
                        this.textoWordParaImportar = res.contenido || '';
                        this.analizarTextoWord();
                        this.mostrarAlerta(`¡Archivo ${file.name} cargado y analizado con éxito!`);
                        this._cdr.markForCheck();
                    },
                    error: (err) => {
                        // Fallback cliente local si la API fallara
                        this.procesandoArchivoWord = false;
                        const reader = new FileReader();
                        reader.onload = (e: any) => {
                            const buffer = e.target.result;
                            const decoder = new TextDecoder('utf-8');
                            const text = decoder.decode(buffer);
                            const matches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
                            if (matches && matches.length > 0) {
                                this.textoWordParaImportar = matches.map(m => m.replace(/<[^>]+>/g, '')).join('\n');
                            } else {
                                this.textoWordParaImportar = text.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, ' ');
                            }
                            this.analizarTextoWord();
                            this._cdr.markForCheck();
                        };
                        reader.readAsArrayBuffer(file);
                    }
                });
        }
    }

    /** Añade un nuevo campo dinámico al formulario */
    agregarCampo(tipo: CampoConfig['tipo'] = 'input'): void {
        const nuevoId = 'campo_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        const orden = this.campos.length + 1;
        const pasoAsignado = this.diseno.modoPasos ? (this.pasoSimuladorActual || 1) : 1;

        let opcionesDefault: string[] | undefined;
        let filasMatriz: FilaMatrizConfig[] | undefined;
        let columnasMatriz: ColumnaMatrizConfig[] | undefined;
        let escalaInf: string | undefined;
        let escalaSup: string | undefined;
        let etiqueta = `Nuevo campo ${orden}`;
        let placeholder = 'Ingresa la información...';

        if (tipo === 'select' || tipo === 'radio') {
            opcionesDefault = ['Opción 1', 'Opción 2', 'Opción 3'];
        } else if (tipo === 'checkbox') {
            opcionesDefault = ['Interés 1', 'Interés 2', 'Interés 3'];
        } else if (tipo === 'textarea') {
            placeholder = 'Escribe aquí tu respuesta detallada...';
        } else if (tipo === 'matrix') {
            etiqueta = 'SATISFACCIÓN CON EL EVENTO';
            placeholder = 'Marca una opción por cada aspecto: 1 = Muy insatisfecho(a) · 2 = Insatisfecho(a) · 3 = Neutral · 4 = Satisfecho(a) · 5 = Muy satisfecho(a)';
            filasMatriz = this.crearFilasDefaultMatriz();
            columnasMatriz = this.crearColumnasDefaultMatriz();
            escalaInf = '1 = Muy insatisfecho(a)';
            escalaSup = '5 = Muy satisfecho(a)';
        } else if (tipo === 'section') {
            etiqueta = 'BLOQUE 2. SECCIÓN ESPECÍFICA';
            placeholder = 'Por favor completa la información correspondiente a este módulo o reunión.';
        }

        const nuevoCampo: CampoConfig = {
            id: nuevoId,
            tipo: tipo,
            etiqueta: etiqueta,
            placeholder: placeholder,
            requerido: tipo === 'section' ? false : false,
            ancho: 'full',
            campoEstandar: '',
            opciones: opcionesDefault,
            paso: pasoAsignado,
            filasMatriz: filasMatriz,
            columnasMatriz: columnasMatriz,
            escalaNotaInferior: escalaInf,
            escalaNotaSuperior: escalaSup,
            dependeDeOperador: 'equals',
            orden: orden
        };

        this.campos.push(nuevoCampo);
        if (tipo === 'checkbox') {
            this.previewRespuestas[nuevoId] = [];
        } else if (tipo === 'matrix') {
            this.previewRespuestas[nuevoId] = {};
        } else {
            this.previewRespuestas[nuevoId] = '';
        }
        this.reordenarCampos();
        this._cdr.markForCheck();
    }

    /** Carga automáticamente una plantilla completa con etapas, secciones condicionales y matriz 1-5 */
    cargarPlantillaSatisfaccionEtapas(): void {
        this.diseno.tipoFormulario = 'Satisfaccion';
        this.diseno.mostrarQrExito = false;
        this.diseno.botonTexto = 'Enviar Encuesta';
        this.diseno.mensajeExito = '¡Muchas gracias por tus respuestas! Tu opinión es fundamental para la mejora continua.';
        this.diseno.modoPasos = true;
        this.diseno.pasos = [
            { numero: 1, titulo: 'Paso 1: Participación y Etapas', descripcion: 'Indícanos en cuáles sesiones y actividades estuviste presente.' },
            { numero: 2, titulo: 'Paso 2: Evaluación Detallada', descripcion: 'Califícanos según tu experiencia en cada aspecto del evento.' }
        ];

        const idPreguntaEtapas = 'campo_etapas_' + Date.now().toString(36);

        this.campos = [
            // Paso 1: Pregunta de etapas con casillas múltiples (Checkboxes)
            {
                id: idPreguntaEtapas,
                tipo: 'checkbox',
                etiqueta: '¿En cuáles de las siguientes etapas participaste? (Selecciona todas las que correspondan)',
                placeholder: 'Selecciona una o varias opciones',
                requerido: true,
                ancho: 'full',
                paso: 1,
                orden: 1,
                opciones: [
                    'Organización previa Asamblea UNCE',
                    'Asamblea UNCE –Día 30 CIAT',
                    'Organización previa Foro Energiza',
                    'Foro Energiza – Día 1',
                    'Cóctel- Día 1 Lobby Tuzoforum',
                    'Foro Energiza – Día 2',
                    'Comida de Honor -Día 2 Bife Sport',
                    'Desmontaje y cierre operativo en Tuzoforum'
                ]
            },
            // Paso 2: Separador de Bloque / Sección condicional para Foro Energiza
            {
                id: 'bloque_foro_energiza',
                tipo: 'section',
                etiqueta: 'BLOQUE 2. FORO ENERGIZA',
                placeholder: 'Evaluación exclusiva para participantes del Foro Energiza',
                requerido: false,
                ancho: 'full',
                paso: 2,
                orden: 2,
                dependeDeCampoId: idPreguntaEtapas,
                dependeDeValor: 'Foro Energiza',
                dependeDeOperador: 'contains'
            },
            // Paso 2: Pregunta de experiencia en Foro Energiza
            {
                id: 'exp_foro_energiza',
                tipo: 'radio',
                etiqueta: '¿Cuál es tu nivel de experiencia participando en Foro Energiza?',
                placeholder: '',
                requerido: false,
                ancho: 'full',
                paso: 2,
                orden: 3,
                opciones: ['Primera edición', 'Segunda edición', 'Tercera edición'],
                dependeDeCampoId: idPreguntaEtapas,
                dependeDeValor: 'Foro Energiza',
                dependeDeOperador: 'contains'
            },
            // Paso 2: Matriz / Tabla Escala 1 al 5
            {
                id: 'matriz_satisfaccion_fe',
                tipo: 'matrix',
                etiqueta: '4. SATISFACCIÓN CON EL EVENTO',
                placeholder: 'Marca una opción por cada aspecto: 1 = Muy insatisfecho(a) · 2 = Insatisfecho(a) · 3 = Neutral · 4 = Satisfecho(a) · 5 = Muy satisfecho(a)',
                requerido: false,
                ancho: 'full',
                paso: 2,
                orden: 4,
                dependeDeCampoId: idPreguntaEtapas,
                dependeDeValor: 'Foro Energiza',
                dependeDeOperador: 'contains',
                escalaNotaInferior: '1 = Muy insatisfecho(a)',
                escalaNotaSuperior: '5 = Muy satisfecho(a)',
                columnasMatriz: this.crearColumnasDefaultMatriz(),
                filasMatriz: [
                    { id: 'm_org_gen', texto: 'Organización general del evento' },
                    { id: 'm_atn_prev', texto: 'Atención y comunicación previa al evento' },
                    { id: 'm_proc_reg', texto: 'Proceso de registro como expositor / asistente' },
                    { id: 'm_mont_stand', texto: 'Montaje y condiciones de espacios y stands' },
                    { id: 'm_ubic_stand', texto: 'Ubicación y señalización de espacios' },
                    { id: 'm_atn_staff', texto: 'Atención del equipo de Foro Energiza' },
                    { id: 'm_act_prog', texto: 'Actividades y programa del evento' },
                    { id: 'm_conf_pan', texto: 'Conferencias, paneles y talleres' },
                    { id: 'm_netw_b2b', texto: 'Oportunidades de networking y mesas de negocio B2B' },
                    { id: 'm_log_oper', texto: 'Logística y operación durante el evento' }
                ]
            },
            // Comentarios finales
            {
                id: 'campo_comentarios_finales',
                tipo: 'textarea',
                etiqueta: '¿Qué sugerencias o comentarios tienes para próximas ediciones?',
                placeholder: 'Escribe aquí tu opinión sincera...',
                requerido: false,
                ancho: 'full',
                paso: 2,
                orden: 5
            }
        ];

        this.inicializarPreviewRespuestas();
        // Por defecto en el simulador seleccionamos 'Foro Energiza – Día 2' para que se vea el bloque
        this.previewRespuestas[idPreguntaEtapas] = ['Foro Energiza – Día 2'];
        this.pasoSimuladorActual = 1;
        this.activeTab = 'campos';
        this.mostrarAlerta('¡Plantilla con Etapas, Bloques y Matriz cargada exitosamente!');
        this._cdr.markForCheck();
    }

    /** Elimina un campo */
    eliminarCampo(index: number): void {
        const campo = this.campos[index];
        delete this.previewRespuestas[campo.id];
        this.campos.splice(index, 1);
        this.reordenarCampos();
    }

    /** Mover campo arriba */
    moverArriba(index: number): void {
        if (index <= 0) return;
        const temp = this.campos[index];
        this.campos[index] = this.campos[index - 1];
        this.campos[index - 1] = temp;
        this.reordenarCampos();
    }

    /** Mover campo abajo */
    moverAbajo(index: number): void {
        if (index >= this.campos.length - 1) return;
        const temp = this.campos[index];
        this.campos[index] = this.campos[index + 1];
        this.campos[index + 1] = temp;
        this.reordenarCampos();
    }

    /** Duplicar campo existente */
    duplicarCampo(index: number): void {
        const original = this.campos[index];
        const copia: CampoConfig = {
            ...JSON.parse(JSON.stringify(original)),
            id: 'campo_' + Date.now().toString(36),
            etiqueta: original.etiqueta + ' (Copia)',
            orden: this.campos.length + 1
        };
        this.campos.splice(index + 1, 0, copia);
        this.reordenarCampos();
    }

    /** Reordena índices de campos */
    reordenarCampos(): void {
        this.campos.forEach((c, idx) => c.orden = idx + 1);
    }

    /** Agregar opción a un campo de tipo select/radio/checkbox */
    agregarOpcion(campo: CampoConfig): void {
        if (!campo.opciones) campo.opciones = [];
        campo.opciones.push(`Opción ${campo.opciones.length + 1}`);
    }

    /** Eliminar opción de un campo */
    eliminarOpcion(campo: CampoConfig, optIndex: number): void {
        if (!campo.opciones) return;
        campo.opciones.splice(optIndex, 1);
    }

    /** Manejo de cambio de imagen de portada por archivo local */
    onFileSelected(event: any): void {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.mostrarAlerta('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.imagenPortadaUrl = e.target.result;
            this._cdr.markForCheck();
        };
        reader.readAsDataURL(file);
    }

    /** Asigna un preset de portada */
    seleccionarPresetPortada(url: string): void {
        this.imagenPortadaUrl = url;
    }

    /** Obtiene el enlace público absoluto */
    get enlacePublico(): string {
        if (!this.slug) return '';
        let pathname = window.location.pathname;
        if (!pathname.endsWith('/')) pathname += '/';
        return `${window.location.origin}${pathname}#/eventos/registro/${this.slug}`;
    }

    /** Copia el enlace al portapapeles */
    copiarEnlace(): void {
        if (!this.enlacePublico) return;
        if (this.currentFormId === 0) {
            this.mostrarAlerta('Debes guardar el formulario haciendo clic en "Guardar Formulario" (esquina superior derecha) antes de compartirlo.');
            return;
        }
        navigator.clipboard.writeText(this.enlacePublico).then(() => {
            this.mostrarAlerta('¡Enlace público copiado al portapapeles!');
        }).catch(() => {
            this.mostrarAlerta('No se pudo copiar el enlace. Cópialo manualmente.');
        });
    }

    /** Abre la vista pública en nueva pestaña */
    abrirEnlacePublico(): void {
        if (!this.enlacePublico) return;
        if (this.currentFormId === 0) {
            this.mostrarAlerta('Debes guardar el formulario haciendo clic en "Guardar Formulario" (esquina superior derecha) antes de abrirlo.');
            return;
        }
        window.open(this.enlacePublico, '_blank');
    }

    /** Genera URL de código QR vía API pública segura */
    get qrCodeUrl(): string {
        if (!this.enlacePublico) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.enlacePublico)}`;
    }

    /** Manejo de cambio de tipo de campo en el selector */
    onTipoCampoChange(campo: CampoConfig): void {
        if ((campo.tipo === 'select' || campo.tipo === 'radio' || campo.tipo === 'checkbox') && (!campo.opciones || campo.opciones.length === 0)) {
            campo.opciones = ['Opción 1', 'Opción 2', 'Opción 3'];
        }
        if (campo.tipo === 'checkbox' && !Array.isArray(this.previewRespuestas[campo.id])) {
            this.previewRespuestas[campo.id] = [];
        }
        if (campo.tipo === 'matrix') {
            if (!campo.filasMatriz || campo.filasMatriz.length === 0) {
                campo.filasMatriz = this.crearFilasDefaultMatriz();
            }
            if (!campo.columnasMatriz || campo.columnasMatriz.length === 0) {
                campo.columnasMatriz = this.crearColumnasDefaultMatriz();
            }
            if (!campo.escalaNotaInferior) campo.escalaNotaInferior = '1 = Muy insatisfecho(a)';
            if (!campo.escalaNotaSuperior) campo.escalaNotaSuperior = '5 = Muy satisfecho(a)';
            if (!this.previewRespuestas[campo.id] || typeof this.previewRespuestas[campo.id] !== 'object') {
                this.previewRespuestas[campo.id] = {};
            }
        }
    }

    /** Guarda la configuración completa */
    guardar(): void {
        if (!this.selectedEventoId) {
            this.mostrarAlerta('Selecciona un evento.');
            return;
        }

        if (!this.titulo.trim()) {
            this.mostrarAlerta('El título del formulario es obligatorio.');
            this.activeTab = 'general';
            return;
        }

        if (!this.slug.trim()) {
            this.mostrarAlerta('El enlace amigable (slug) es obligatorio.');
            this.activeTab = 'enlace';
            return;
        }

        if (this.campos.length === 0) {
            this.mostrarAlerta('Agrega al menos un campo al cuestionario.');
            this.activeTab = 'campos';
            return;
        }

        // Asegurar que campos con opciones tengan valores por defecto
        this.campos.forEach(c => {
            if (c.tipo === 'select' || c.tipo === 'radio' || c.tipo === 'checkbox') {
                if (!c.opciones || c.opciones.length === 0) {
                    c.opciones = ['Opción 1', 'Opción 2'];
                } else {
                    c.opciones = c.opciones.map(o => o ? o.trim() : '').filter(o => o.length > 0);
                    if (c.opciones.length === 0) c.opciones = ['Opción 1', 'Opción 2'];
                }
            } else if (c.tipo === 'matrix') {
                if (!c.columnasMatriz || c.columnasMatriz.length === 0) {
                    c.columnasMatriz = this.crearColumnasDefaultMatriz();
                }
                if (!c.filasMatriz || c.filasMatriz.length === 0) {
                    c.filasMatriz = this.crearFilasDefaultMatriz();
                }
            }
        });

        this.saving = true;

        const payload = {
            id: this.currentFormId,
            eventoId: Number(this.selectedEventoId),
            slug: this.generarSlug(this.slug),
            titulo: this.titulo.trim(),
            descripcion: this.descripcion?.trim() || '',
            imagenPortadaUrl: this.imagenPortadaUrl,
            camposConfigJson: JSON.stringify(this.campos),
            disenoConfigJson: JSON.stringify(this.diseno),
            moduloDestino: this.moduloDestino,
            activo: this.activo
        };

        this._formService.guardarConfiguracion(payload)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (res) => {
                    this.saving = false;
                    this.currentFormId = res.id;
                    this.slug = res.slug;
                    this.mostrarAlerta('¡Formulario guardado exitosamente!');
                    this.cargarListadoFormularios();
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.saving = false;
                    const msg = err?.error?.mensaje || err?.message || 'Error al guardar configuración.';
                    this.mostrarAlerta(msg);
                }
            });
    }

    /** Carga respuestas recibidas para el evento */
    cargarRespuestas(): void {
        if (!this.selectedEventoId) return;
        this.cargandoRespuestas = true;
        this._formService.getRespuestasPorEvento(this.selectedEventoId)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (data) => {
                    this.respuestasEvento = (data || []).map(r => {
                        let parsed = {};
                        try {
                            parsed = JSON.parse(r.respuestasJson);
                        } catch {
                            parsed = {};
                        }
                        return { ...r, respuestasObj: parsed };
                    });
                    this.totalRespuestas = this.respuestasEvento.length;
                    this.cargandoRespuestas = false;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.cargandoRespuestas = false;
                }
            });
    }

    /** Evalúa si un campo o sección debe ser visible según dependencias condicionales */
    esCampoVisible(campo: CampoConfig): boolean {
        if (!campo.dependeDeCampoId) {
            return true;
        }

        const valorDependencia = this.previewRespuestas[campo.dependeDeCampoId];
        if (valorDependencia === undefined || valorDependencia === null || valorDependencia === '') {
            return false;
        }

        const valRequerido = (campo.dependeDeValor || '').toLowerCase().trim();
        if (!valRequerido) {
            return true;
        }

        // Si el campo padre es selección múltiple (checkbox)
        if (Array.isArray(valorDependencia)) {
            if (valorDependencia.length === 0) return false;
            return valorDependencia.some(v => {
                const item = (v || '').toLowerCase().trim();
                return item === valRequerido || item.includes(valRequerido) || valRequerido.includes(item);
            });
        }

        const valActual = String(valorDependencia).toLowerCase().trim();
        if (campo.dependeDeOperador === 'contains') {
            return valActual.includes(valRequerido) || valRequerido.includes(valActual);
        }

        return valActual === valRequerido || valActual.includes(valRequerido);
    }

    onFileSelectedPreview(event: any, campoId: string): void {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.previewRespuestas[campoId] = reader.result as string; // Guardar como Base64
                this._cdr.markForCheck();
            };
            reader.readAsDataURL(file);
        }
    }

    /** Exporta respuestas del formulario a formato CSV */
    exportarRespuestasCsv(): void {
        if (this.respuestasEvento.length === 0) {
            this.mostrarAlerta('No hay respuestas para exportar.');
            return;
        }

        const headers = ['ID', 'Asistente', 'Correo', 'Teléfono', 'Fecha Registro', 'IP'];
        const dynamicKeys = this.campos.map(c => c.etiqueta);
        const allHeaders = [...headers, ...dynamicKeys];

        const rows = this.respuestasEvento.map(r => {
            const row = [
                r.id,
                `"${(r.nombreAsistente || '').replace(/"/g, '""')}"`,
                `"${r.correoAsistente || ''}"`,
                `"${r.telefonoAsistente || ''}"`,
                `"${new Date(r.fechaRegistro).toLocaleString()}"`,
                `"${r.ipOrigen || ''}"`
            ];

            this.campos.forEach(c => {
                const val = r.respuestasObj ? r.respuestasObj[c.id] : '';
                const formatVal = Array.isArray(val) ? val.join('; ') : (val ?? '');
                row.push(`"${String(formatVal).replace(/"/g, '""')}"`);
            });

            return row.join(',');
        });

        const csvContent = '\uFEFF' + [allHeaders.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respuestas-registro-${this.slug || 'evento'}.csv`;
        a.click();
    }

    /** Alternar selección de checkbox en preview interactivo */
    toggleCheckboxPreview(campoId: string, opcion: string): void {
        if (!this.previewRespuestas[campoId]) {
            this.previewRespuestas[campoId] = [];
        }
        const arr = this.previewRespuestas[campoId] as string[];
        const idx = arr.indexOf(opcion);
        if (idx >= 0) {
            arr.splice(idx, 1);
        } else {
            arr.push(opcion);
        }
    }

    /** Helper para trackBy en ngFor */
    trackByIndex(index: number): number {
        return index;
    }

    /** Helper para generar slugs limpios */
    generarSlug(texto: string): string {
        return texto
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Elimina acentos
            .replace(/[^a-z0-9\s-]/g, '')                     // Elimina caracteres especiales
            .trim()
            .replace(/\s+/g, '-');                             // Espacios por guiones
    }

    /** Notificación flotante rápida */
    mostrarAlerta(mensaje: string): void {
        this._snackBar.open(mensaje, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
        });
    }

    // ─────────────────────────────────────────────────────────────
    // GESTIÓN DINÁMICA DE REGISTRADOS POR MÓDULO DESTINO
    // ─────────────────────────────────────────────────────────────

    /** Carga los registros de acuerdo al evento seleccionado y al módulo destino */
    cargarPersonasModuloDestino(): void {
        if (!this.selectedEventoId) return;
        this.cargandoPersonasModulo = true;
        this._cdr.markForCheck();

        const evId = Number(this.selectedEventoId);

        if (this.moduloDestino === 'Asistentes') {
            this._eventosService.loadAsistentesPorEvento(evId);
            // El subject asistentes$ se encargará de actualizar asistentesList
        } else if (this.moduloDestino === 'Staff' || this.moduloDestino === 'Expositores') {
            this._staffService.getAll()
                .pipe(takeUntil(this._destroy$))
                .subscribe({
                    next: (list) => {
                        const delEvento = (list || []).filter(p =>
                            !p.eventoIds || p.eventoIds.length === 0 || p.eventoIds.some(id => Number(id) === evId)
                        );
                        this.expositoresList = delEvento.filter(p => p.tipoPersonal === 'Expositor');
                        this.staffList = delEvento.filter(p => p.tipoPersonal !== 'Expositor');
                        this.cargandoPersonasModulo = false;
                        this._cdr.markForCheck();
                    },
                    error: (err) => {
                        console.error('Error al cargar personal staff/expositores:', err);
                        this.cargandoPersonasModulo = false;
                        this._cdr.markForCheck();
                    }
                });
        } else if (this.moduloDestino === 'PersonalInterno') {
            this._usersService.getUsers()
                .pipe(takeUntil(this._destroy$))
                .subscribe({
                    next: (users) => {
                        this.usuariosCrmList = users || [];
                        this.cargandoPersonasModulo = false;
                        this._cdr.markForCheck();
                    },
                    error: (err) => {
                        console.error('Error al cargar usuarios CRM:', err);
                        this.cargandoPersonasModulo = false;
                        this._cdr.markForCheck();
                    }
                });
        }
    }

    /** Maneja el cambio de módulo destino y recarga la lista adecuada */
    onModuloDestinoChange(nuevoModulo: string): void {
        this.moduloDestino = nuevoModulo;
        this.cargarPersonasModuloDestino();
        this._cdr.markForCheck();
    }

    /** Maneja el cambio de evento seleccionado en el editor */
    onEventoChange(eventoId: number): void {
        this.selectedEventoId = eventoId;
        this.cargarPersonasModuloDestino();
        this.cargarRespuestas();
        if (this.currentFormId === 0) {
            const eventoSeleccionado = this.eventos.find(e => e.id === eventoId);
            if (eventoSeleccionado) {
                this.slug = this.generarSlug(eventoSeleccionado.nombre + ' ' + (eventoSeleccionado.anio || ''));
            }
        }
        this._cdr.markForCheck();
    }

    /** Listado filtrado y unificado para la tabla de participantes del módulo seleccionado */
    get personasModuloFiltradas(): any[] {
        let list: any[] = [];
        if (this.moduloDestino === 'Asistentes') {
            list = this.asistentesList.map(a => ({
                id: a.id,
                nombre: `${a.nombre} ${a.apellidos}`.trim(),
                correo: a.correo,
                telefono: a.telefono,
                rol: a.tipo || 'General',
                organizacion: a.empresa || a.universidad || 'Sin especificar',
                estatus: a.asistencia || 'Faltante',
                estatusBadge: a.asistencia === 'Presente' ? 'success' : 'neutral',
                fecha: a.fechaRegistro,
                avatar: null,
                original: a
            }));
        } else if (this.moduloDestino === 'Expositores') {
            list = this.expositoresList.map(e => ({
                id: e.id,
                nombre: e.nombreCompleto,
                correo: e.correoElectronico,
                telefono: e.telefonoWhatsapp || e.telefonoOficina || 'Sin teléfono',
                rol: 'Expositor / Ponente',
                organizacion: e.empresa ? `${e.cargo || ''} (${e.empresa})`.trim() : (e.cargo || 'Expositor'),
                estatus: e.emailEnviado ? 'QR Enviado' : 'Pendiente',
                estatusBadge: e.emailEnviado ? 'info' : 'warning',
                fecha: e.fechaRegistro,
                avatar: e.fotoPath ? this._staffService.getPhotoUrl(e.id) : null,
                original: e
            }));
        } else if (this.moduloDestino === 'Staff') {
            list = this.staffList.map(s => ({
                id: s.id,
                nombre: s.nombreCompleto,
                correo: s.correoElectronico,
                telefono: s.telefonoWhatsapp || s.telefonoOficina || 'Sin teléfono',
                rol: s.tipoPersonal || 'Staff',
                organizacion: s.cargo || s.empresa || 'Staff de Logística',
                estatus: s.emailEnviado ? 'QR Enviado' : 'Pendiente',
                estatusBadge: s.emailEnviado ? 'info' : 'warning',
                fecha: s.fechaRegistro,
                avatar: s.fotoPath ? this._staffService.getPhotoUrl(s.id) : null,
                original: s
            }));
        } else if (this.moduloDestino === 'PersonalInterno') {
            list = this.usuariosCrmList.map(u => ({
                id: u.usuarioId || u.id,
                nombre: u.nombreUsuario || `${u.nombre || ''} ${u.apellidos || ''}`.trim(),
                correo: u.email || u.correo,
                telefono: u.telefono || 'Sin teléfono',
                rol: u.nombreRol || 'Usuario CRM',
                organizacion: 'JR Ingeniería Eléctrica',
                estatus: u.activo ? 'Activo' : 'Inactivo',
                estatusBadge: u.activo ? 'success' : 'neutral',
                fecha: u.fechaCreacion,
                avatar: u.avatar || null,
                original: u
            }));
        }

        if (this.busquedaPersonas && this.busquedaPersonas.trim() !== '') {
            const term = this.busquedaPersonas.toLowerCase().trim();
            list = list.filter(p =>
                (p.nombre && p.nombre.toLowerCase().includes(term)) ||
                (p.correo && p.correo.toLowerCase().includes(term)) ||
                (p.telefono && p.telefono.toLowerCase().includes(term)) ||
                (p.rol && p.rol.toLowerCase().includes(term)) ||
                (p.organizacion && p.organizacion.toLowerCase().includes(term))
            );
        }

        return list;
    }

    /** Total de personas registradas en el módulo destino */
    get totalRegistradosModulo(): number {
        if (this.moduloDestino === 'Asistentes') return this.asistentesList.length;
        if (this.moduloDestino === 'Expositores') return this.expositoresList.length;
        if (this.moduloDestino === 'Staff') return this.staffList.length;
        if (this.moduloDestino === 'PersonalInterno') return this.usuariosCrmList.length;
        return 0;
    }

    /** Helper para etiqueta legible del módulo destino */
    obtenerEtiquetaModuloDestino(modulo?: string): string {
        const m = modulo || this.moduloDestino;
        switch (m) {
            case 'Staff': return 'Personal Staff';
            case 'Expositores': return 'Expositores';
            case 'PersonalInterno': return 'Personal Interno';
            default: return 'General (Asistentes)';
        }
    }

    /** Helper para clase CSS del badge del módulo destino */
    obtenerClaseBadgeModulo(modulo?: string): string {
        const m = modulo || this.moduloDestino;
        switch (m) {
            case 'Staff': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60';
            case 'Expositores': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60';
            case 'PersonalInterno': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60';
            default: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60';
        }
    }

    /** Exporta listado de personas del módulo a formato CSV */
    exportarPersonasModuloCsv(): void {
        const data = this.personasModuloFiltradas;
        if (data.length === 0) {
            this.mostrarAlerta('No hay personas para exportar en este módulo.');
            return;
        }

        const headers = ['ID', 'Nombre Completo', 'Correo Electrónico', 'Teléfono', 'Rol / Cargo', 'Organización', 'Estatus', 'Fecha'];
        const rows = data.map(p => [
            p.id,
            `"${(p.nombre || '').replace(/"/g, '""')}"`,
            `"${p.correo || ''}"`,
            `"${p.telefono || ''}"`,
            `"${(p.rol || '').replace(/"/g, '""')}"`,
            `"${(p.organizacion || '').replace(/"/g, '""')}"`,
            `"${p.estatus || ''}"`,
            `"${p.fecha ? new Date(p.fecha).toLocaleDateString() : ''}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `personas-${(this.moduloDestino || 'modulo').toLowerCase()}-evento-${this.selectedEventoId || 'general'}.csv`;
        a.click();
    }

    // ─────────────────────────────────────────────────────────────
    // ENVÍO MASIVO DE FORMULARIOS A USUARIOS / PARTICIPANTES
    // ─────────────────────────────────────────────────────────────

    /** Abre el modal de envío masivo para un formulario específico */
    abrirModalEnvioMasivo(form: FormularioRegistroAdminDto, event?: MouseEvent): void {
        if (event) event.stopPropagation();
        this.formularioParaEnvio = form;
        this.modalEnvioMasivoAbierto = true;
        this.asuntoEnvio = `Invitación: Formulario de Registro - ${form.titulo}`;
        this.mensajeAdicionalEnvio = '';
        this.resultadoEnvio = null;
        this.busquedaDestinatariosEnvio = '';
        this.destinatariosSeleccionadosIds.clear();
        this.cargandoDestinatariosEnvio = true;
        this.destinatariosParaEnvio = [];
        this.historialEnviosMap.clear();

        const evId = Number(form.eventoId);
        const modulo = (form.moduloDestino || 'Asistentes').trim();

        // 1. Cargar historial previo de envíos para anotar los estados
        this._formService.getHistorialEnvios(form.id)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (historial) => {
                    this.historialEnviosMap.clear();
                    (historial || []).forEach(h => {
                        if (h.emailDestinatario) {
                            this.historialEnviosMap.set(h.emailDestinatario.toLowerCase(), h);
                        }
                        if (h.asistenteId) {
                            this.historialEnviosMap.set(`asistente_${h.asistenteId}`, h);
                        }
                        if (h.personalStaffId) {
                            this.historialEnviosMap.set(`staff_${h.personalStaffId}`, h);
                        }
                        if (h.usuarioId) {
                            this.historialEnviosMap.set(`usuario_${h.usuarioId}`, h);
                        }
                    });
                    this._cdr.markForCheck();
                },
                error: () => {}
            });

        // 2. Cargar destinatarios según el módulo destino del formulario
        if (modulo === 'Asistentes') {
            this._http.get<any[]>(`${environment.apiUrl}/Asistentes/evento/${evId}`)
                .pipe(takeUntil(this._destroy$))
                .subscribe({
                    next: (list) => {
                        this.destinatariosParaEnvio = (list || []).map(a => ({
                            id: a.id,
                            asistenteId: a.id,
                            nombre: `${a.nombre || ''} ${a.apellidos || ''}`.trim(),
                            correo: a.correoElectronico || a.correo,
                            telefono: a.numeroTelefonico || a.telefono,
                            rol: a.tipoAsistente || a.tipo || 'Asistente General',
                            organizacion: a.empresaRepresenta || a.universidadRepresentas || a.empresa || a.universidad || 'Sin empresa',
                            tipo: 'Asistente',
                            avatar: null
                        }));
                        this.seleccionarTodos();
                        this.cargandoDestinatariosEnvio = false;
                        this._cdr.markForCheck();
                    },
                    error: () => {
                        this.cargandoDestinatariosEnvio = false;
                        this._cdr.markForCheck();
                    }
                });
        } else if (modulo === 'Staff' || modulo === 'Expositores') {
            this._staffService.getAll()
                .pipe(takeUntil(this._destroy$))
                .subscribe({
                    next: (staff) => {
                        const delEvento = (staff || []).filter(p =>
                            !p.eventoIds || p.eventoIds.length === 0 || p.eventoIds.some(id => Number(id) === evId)
                        );
                        const filtrados = modulo === 'Expositores'
                            ? delEvento.filter(p => p.tipoPersonal === 'Expositor')
                            : delEvento.filter(p => p.tipoPersonal !== 'Expositor');

                        this.destinatariosParaEnvio = filtrados.map(p => ({
                            id: p.id,
                            personalStaffId: p.id,
                            nombre: p.nombreCompleto,
                            correo: p.correoElectronico,
                            telefono: p.telefonoWhatsapp || p.telefonoOficina,
                            rol: p.tipoPersonal || (modulo === 'Expositores' ? 'Expositor' : 'Staff'),
                            organizacion: p.empresa || p.cargo || 'JR Ingeniería',
                            tipo: modulo === 'Expositores' ? 'Expositor' : 'Staff',
                            avatar: p.fotoPath ? this._staffService.getPhotoUrl(p.id) : null
                        }));
                        this.seleccionarTodos();
                        this.cargandoDestinatariosEnvio = false;
                        this._cdr.markForCheck();
                    },
                    error: () => {
                        this.cargandoDestinatariosEnvio = false;
                        this._cdr.markForCheck();
                    }
                });
        } else if (modulo === 'PersonalInterno') {
            this._usersService.getUsers()
                .pipe(takeUntil(this._destroy$))
                .subscribe({
                    next: (users) => {
                        this.destinatariosParaEnvio = (users || []).map(u => ({
                            id: u.usuarioId || u.id,
                            usuarioId: u.usuarioId || u.id,
                            nombre: u.nombreUsuario || `${u.nombre || ''} ${u.apellidos || ''}`.trim(),
                            correo: u.email || u.correo,
                            telefono: u.telefono,
                            rol: u.nombreRol || 'Colaborador JR',
                            organizacion: 'JR Ingeniería Eléctrica',
                            tipo: 'Personal Interno',
                            avatar: u.avatar || null
                        }));
                        this.seleccionarTodos();
                        this.cargandoDestinatariosEnvio = false;
                        this._cdr.markForCheck();
                    },
                    error: () => {
                        this.cargandoDestinatariosEnvio = false;
                        this._cdr.markForCheck();
                    }
                });
        }
        this._cdr.markForCheck();
    }

    cerrarModalEnvioMasivo(): void {
        this.modalEnvioMasivoAbierto = false;
        this.formularioParaEnvio = null;
        this.resultadoEnvio = null;
        this.enviandoMasivo = false;
        this._cdr.markForCheck();
    }

    get totalDestinatariosValidos(): number {
        return this.destinatariosParaEnvio.filter(d => this.tieneCorreoValido(d)).length;
    }

    get sonTodosSeleccionados(): boolean {
        const validos = this.totalDestinatariosValidos;
        return validos > 0 && this.destinatariosSeleccionadosIds.size === validos;
    }

    seleccionarTodos(): void {
        this.destinatariosSeleccionadosIds = new Set(
            this.destinatariosParaEnvio
                .filter(d => this.tieneCorreoValido(d))
                .map(d => d.id)
        );
        this.filtroSeleccionRapida = 'todos';
        this._cdr.markForCheck();
    }

    deseleccionarTodos(): void {
        this.destinatariosSeleccionadosIds.clear();
        this.filtroSeleccionRapida = 'personalizado';
        this._cdr.markForCheck();
    }

    seleccionarSoloSinEnviar(): void {
        this.destinatariosSeleccionadosIds.clear();
        this.destinatariosParaEnvio.forEach(d => {
            if (this.tieneCorreoValido(d)) {
                const info = this.obtenerInfoEnvioPrevio(d);
                if (info.texto === 'Nunca enviado' || info.texto === 'Falló el envío') {
                    this.destinatariosSeleccionadosIds.add(d.id);
                }
            }
        });
        this.filtroSeleccionRapida = 'sin-enviar';
        this._cdr.markForCheck();
    }

    seleccionarSoloSinRespuesta(): void {
        this.destinatariosSeleccionadosIds.clear();
        this.destinatariosParaEnvio.forEach(d => {
            if (this.tieneCorreoValido(d)) {
                const info = this.obtenerInfoEnvioPrevio(d);
                if (info.texto !== '¡Ya contestó!') {
                    this.destinatariosSeleccionadosIds.add(d.id);
                }
            }
        });
        this.filtroSeleccionRapida = 'sin-respuesta';
        this._cdr.markForCheck();
    }

    toggleSeleccionarTodos(): void {
        const filtrados = this.destinatariosEnvioFiltrados.filter(d => this.tieneCorreoValido(d));
        const todosSeleccionados = filtrados.length > 0 && filtrados.every(d => this.destinatariosSeleccionadosIds.has(d.id));

        if (todosSeleccionados) {
            filtrados.forEach(d => this.destinatariosSeleccionadosIds.delete(d.id));
            this.filtroSeleccionRapida = 'personalizado';
        } else {
            filtrados.forEach(d => this.destinatariosSeleccionadosIds.add(d.id));
            if (this.destinatariosSeleccionadosIds.size === this.totalDestinatariosValidos) {
                this.filtroSeleccionRapida = 'todos';
            } else {
                this.filtroSeleccionRapida = 'personalizado';
            }
        }
        this._cdr.markForCheck();
    }

    toggleDestinatario(id: string | number): void {
        const dest = this.destinatariosParaEnvio.find(d => d.id === id);
        if (!dest || !this.tieneCorreoValido(dest)) {
            return;
        }

        if (this.destinatariosSeleccionadosIds.has(id)) {
            this.destinatariosSeleccionadosIds.delete(id);
        } else {
            this.destinatariosSeleccionadosIds.add(id);
        }

        if (this.destinatariosSeleccionadosIds.size === this.totalDestinatariosValidos) {
            this.filtroSeleccionRapida = 'todos';
        } else {
            this.filtroSeleccionRapida = 'personalizado';
        }
        this._cdr.markForCheck();
    }

    estaSeleccionado(id: string | number): boolean {
        return this.destinatariosSeleccionadosIds.has(id);
    }

    tieneCorreoValido(dest: any): boolean {
        return !!(dest && dest.correo && dest.correo.includes('@'));
    }

    get sonTodosFiltradosSeleccionados(): boolean {
        const filtrados = this.destinatariosEnvioFiltrados.filter(d => this.tieneCorreoValido(d));
        return filtrados.length > 0 && filtrados.every(d => this.destinatariosSeleccionadosIds.has(d.id));
    }

    get totalDestinatariosSeleccionados(): number {
        return this.destinatariosSeleccionadosIds.size;
    }

    get destinatariosEnvioFiltrados(): any[] {
        if (!this.busquedaDestinatariosEnvio || this.busquedaDestinatariosEnvio.trim() === '') {
            return this.destinatariosParaEnvio;
        }
        const term = this.busquedaDestinatariosEnvio.toLowerCase().trim();
        return this.destinatariosParaEnvio.filter(d =>
            (d.nombre && d.nombre.toLowerCase().includes(term)) ||
            (d.correo && d.correo.toLowerCase().includes(term)) ||
            (d.rol && d.rol.toLowerCase().includes(term)) ||
            (d.organizacion && d.organizacion.toLowerCase().includes(term))
        );
    }

    obtenerInfoEnvioPrevio(dest: any): { texto: string; clase: string; icon: string } {
        const keyEmail = dest.correo ? dest.correo.toLowerCase() : '';
        const keyAsistente = dest.asistenteId ? `asistente_${dest.asistenteId}` : '';
        const keyStaff = dest.personalStaffId ? `staff_${dest.personalStaffId}` : '';
        const keyUsuario = dest.usuarioId ? `usuario_${dest.usuarioId}` : '';

        const registro = this.historialEnviosMap.get(keyEmail) ||
                         (keyAsistente ? this.historialEnviosMap.get(keyAsistente) : undefined) ||
                         (keyStaff ? this.historialEnviosMap.get(keyStaff) : undefined) ||
                         (keyUsuario ? this.historialEnviosMap.get(keyUsuario) : undefined);

        if (!registro) {
            return {
                texto: 'Nunca enviado',
                clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
                icon: 'mail_outline'
            };
        }

        if (registro.respondio) {
            return {
                texto: '¡Ya contestó!',
                clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700',
                icon: 'check_circle'
            };
        }

        if (registro.estadoEnvio === 'Enviado') {
            const fecha = registro.fechaEnvio ? new Date(registro.fechaEnvio).toLocaleDateString() : '';
            const canalTxt = registro.canal === 'Email + WhatsApp' ? ' (Email + WA)' : (registro.canal ? ` (${registro.canal})` : '');
            return {
                texto: `Enviado ${fecha}${canalTxt}${registro.reenvios > 0 ? ` (${registro.reenvios} reenvíos)` : ''}`,
                clase: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
                icon: registro.whatsappEnviado ? 'chat' : 'mark_email_read'
            };
        }

        if (registro.estadoEnvio === 'Parcial') {
            const fecha = registro.fechaEnvio ? new Date(registro.fechaEnvio).toLocaleDateString() : '';
            return {
                texto: `Parcial ${fecha} (Email ok, WA pendiente)`,
                clase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
                icon: 'warning'
            };
        }

        return {
            texto: 'Falló el envío',
            clase: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-700',
            icon: 'error_outline'
        };
    }

    ejecutarEnvioMasivo(): void {
        if (!this.formularioParaEnvio) return;
        if (this.totalDestinatariosSeleccionados === 0) {
            this.mostrarAlerta('Debes seleccionar al menos un destinatario para realizar el envío.');
            return;
        }

        const formId = this.formularioParaEnvio.id;
        const seleccionados = this.destinatariosParaEnvio.filter(d => this.destinatariosSeleccionadosIds.has(d.id));

        const dto: EnvioMasivoFormularioRequestDto = {
            asunto: this.asuntoEnvio,
            mensajeAdicional: this.mensajeAdicionalEnvio,
            urlBase: window.location.origin + window.location.pathname,
            destinatarios: seleccionados.map(d => ({
                asistenteId: d.asistenteId,
                personalStaffId: d.personalStaffId,
                usuarioId: d.usuarioId,
                nombre: d.nombre,
                email: d.correo,
                telefono: d.telefono,
                rolCargo: d.rol,
                organizacion: d.organizacion
            }))
        };

        this.enviandoMasivo = true;
        this.resultadoEnvio = null;
        this._cdr.markForCheck();

        this._formService.enviarMasivo(formId, dto)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (res) => {
                    this.enviandoMasivo = false;
                    this.resultadoEnvio = res;
                    const waExitosos = res.whatsappExitosos || 0;
                    this.mostrarAlerta(`¡Envío finalizado! ${res.enviadosExitosos} correos y ${waExitosos} mensajes de WhatsApp enviados (${res.fallidos} fallidos).`);

                    // Actualizar mapa de historial en tiempo real
                    this._formService.getHistorialEnvios(formId)
                        .pipe(takeUntil(this._destroy$))
                        .subscribe(hist => {
                            (hist || []).forEach(h => {
                                if (h.emailDestinatario) this.historialEnviosMap.set(h.emailDestinatario.toLowerCase(), h);
                            });
                            this._cdr.markForCheck();
                        });

                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.enviandoMasivo = false;
                    const msg = err?.error?.mensaje || 'Error al procesar el envío masivo.';
                    this.mostrarAlerta(msg);
                    this._cdr.markForCheck();
                }
            });
    }
}
