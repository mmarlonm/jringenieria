import { Injectable, inject } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable, Subject, catchError, concatMap, from, map, of, switchMap, toArray } from 'rxjs';

import { environment } from 'environments/environment';



export interface FilaMatrizConfig {

    id: string;

    texto: string;

    subtexto?: string;

}



export interface ColumnaMatrizConfig {

    valor: string;

    etiqueta: string;

}



export interface PasoFormularioConfig {

    numero: number;

    titulo: string;

    descripcion?: string;

}



export interface CampoConfig {
    id: string;
    tipo: 'input' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'tel' | 'matrix' | 'section' | 'file';
    etiqueta: string;
    placeholder?: string;
    requerido: boolean;
    opciones?: string[];
    ancho?: 'full' | 'half';
    orden: number;
    paso?: number;
    escalaNotaInferior?: string;
    escalaNotaSuperior?: string;
    filasMatriz?: FilaMatrizConfig[];
    columnasMatriz?: ColumnaMatrizConfig[];
    dependeDeCampoId?: string;
    dependeDeOperador?: 'equals' | 'contains';
    dependeDeValor?: string;
    campoEstandar?: string;
}



export interface DisenoConfig {

    tipoFormulario: 'Satisfaccion' | 'Registro';

    modoPasos: boolean;

    pasos: PasoFormularioConfig[];

    colorPrimario: string;

    colorFondo: string;

    estiloCard: 'solid' | 'glassmorphism' | 'bordered';

    radioBorde: 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';

    alturaPortada: 'compact' | 'medium' | 'tall';

    botonTexto: string;

    mensajeExito: string;

    mostrarQrExito: boolean;

    temaOscuro: boolean;

}



export interface FormularioProductoDto {

    id: number;

    slug: string;

    titulo: string;

    descripcion?: string;

    imagenPortadaUrl?: string;

    camposConfigJson: string;

    disenoConfigJson: string;

    tipo: 'producto' | 'servicio';

    sucursalId?: number;

    activo: boolean;

    fechaCreacion: string;

    fechaModificacion?: string;

    totalRespuestas: number;

}



export interface FormularioProductoSaveDto {

    id: number;

    slug: string;

    titulo: string;

    descripcion?: string;

    imagenPortadaUrl?: string;

    camposConfigJson: string;

    disenoConfigJson: string;

    tipo: 'producto' | 'servicio';

    sucursalId?: number;

    activo: boolean;

}



export interface FormularioProductoRespuestaDetalleDto {

    id: number;

    formularioId: number;

    tipo?: 'producto' | 'servicio';

    cotizacionProductoId?: number;

    nombreCliente?: string;

    emailCliente?: string;

    telefonoCliente?: string;

    empresaCliente?: string;

    cargoCliente?: string;

    sucursal?: number;

    respuestasJson: string;

    calificacionGeneral?: number;

    fechaRegistro: string;

    ipOrigen?: string;

}

export interface EncuestaRespuestaResumenDto {
    origen: 'dinamica' | 'heredada';
    id: number;
    formularioId?: number | null;
    formularioTitulo?: string | null;
    tipo: 'producto' | 'servicio';
    nombre?: string | null;
    empresa?: string | null;
    email?: string | null;
    telefono?: string | null;
    cargo?: string | null;
    calificacion?: number | null;
    fechaRegistro: string;
}

export interface EncuestaRespuestaCampoDto {
    campoId: string;
    etiqueta: string;
    tipo: string;
    valor: string;
}

export interface EncuestaRespuestaDetalleDto extends EncuestaRespuestaResumenDto {
    respuestas: EncuestaRespuestaCampoDto[];
}



@Injectable({

    providedIn: 'root'

})

export class SurveysProductsService {

    private _http = inject(HttpClient);

    private readonly apiUrl = `${environment.apiUrl}/Encuesta`;



    private readonly STORAGE_KEY = 'jr_formularios_productos_cache';

    private readonly STORAGE_RESPUESTAS_KEY = 'jr_respuestas_productos_cache';

    /** Encuestas que solo existen en este navegador y todavía no se pudieron subir al servidor. */
    private readonly STORAGE_PENDIENTES_KEY = 'jr_formularios_productos_pendientes';

    /** Las dos plantillas que la pantalla ofrece de inicio; mientras nadie las modifique no son datos de nadie. */
    private readonly SLUGS_PREDETERMINADOS = ['satisfaccion-productos', 'satisfaccion-servicios'];

    /**
     * Avisa cuando se encontraron encuestas guardadas solo en este navegador (por una falla anterior del servidor).
     * Emite únicamente si había algo que recuperar o quedó algo pendiente; si no hay nada, no emite.
     */
    readonly recuperados$ = new Subject<{ titulos: string[]; pendientes: number }>();

    /** Avisa cuando no se pudo leer la lista del servidor y lo que se muestra es la copia guardada en este navegador. */
    readonly servidorNoDisponible$ = new Subject<void>();

    /** Antes de reemplazar la copia del navegador por la lista del servidor se respalda lo que difiera (últimas 5 veces). */
    private readonly STORAGE_RESPALDO_KEY = 'jr_formularios_productos_respaldo';
    private readonly MAX_RESPALDOS = 5;

    /** Firmas de lo último que se copió DEL servidor: sirven para distinguir una copia del servidor de una edición hecha en el navegador. */
    private readonly STORAGE_SINCRONIZADO_KEY = 'jr_formularios_productos_sincronizado';



    // =========================================================================

    // CONFIGURACIÓN DE FORMULARIOS DE PRODUCTOS (Estilo Configurador)

    // =========================================================================



    /** Obtiene todos los formularios de encuestas de productos configurados */

    getFormularios(): Observable<FormularioProductoDto[]> {
        return this._http.get<{ code: number; message: string; data: FormularioProductoDto[] }>(
            `${this.apiUrl}/productos/formularios`
        ).pipe(
            switchMap(res => {
                const servidor = res?.data ?? [];
                const locales = this.formulariosSoloLocales(servidor);

                // Antes la copia del navegador se sobrescribía con la lista del servidor: lo que solo existía en el navegador se perdía.
                if (locales.length > 0) {
                    return this.subirFormulariosLocales(servidor, locales);
                }
                if (servidor.length > 0) {
                    this.reemplazarCopiaConLaDelServidor(servidor);
                    return of(servidor);
                }
                return of(this.obtenerPredeterminadosStorage());
            }),
            catchError(() => {
                // Antes se mostraba la copia del navegador sin decir nada; ahora la pantalla avisa que el servidor no respondió.
                this.servidorNoDisponible$.next();
                return of(this.obtenerPredeterminadosStorage());
            })
        );
    }



    /** Obtiene un formulario por su ID */

    getFormularioById(id: number): Observable<FormularioProductoDto | null> {

        return this._http.get<{ code: number; message: string; data: FormularioProductoDto }>(

            `${this.apiUrl}/productos/formularios/${id}`

        ).pipe(

            map(res => res?.data || null),

            catchError(() => {

                const lista = this.obtenerPredeterminadosStorage();

                return of(lista.find(f => f.id === id) || null);

            })

        );

    }



    /** Obtiene un formulario por su Slug para la vista pública */

    getFormularioBySlug(slug: string): Observable<FormularioProductoDto | null> {

        const cleanSlug = (slug || '').trim().toLowerCase();

        return this._http.get<{ code: number; message: string; data: FormularioProductoDto }>(

            `${this.apiUrl}/productos/formularios/slug/${encodeURIComponent(cleanSlug)}`

        ).pipe(

            map(res => res?.data || null),

            catchError(() => {

                const lista = this.obtenerPredeterminadosStorage();

                return of(lista.find(f => f.slug.toLowerCase() === cleanSlug) || null);

            })

        );

    }



    /** Guarda o actualiza un formulario */

    guardarFormulario(dto: FormularioProductoSaveDto): Observable<FormularioProductoDto> {
        // Sin plan B local: si el servidor falla, quien guarda debe enterarse. Guardar "en silencio" solo en el navegador
        // hacía parecer guardada una encuesta que luego desaparecía al recargar la lista.
        return this._http.post<{ code: number; message: string; data: FormularioProductoDto }>(
            `${this.apiUrl}/productos/formularios`, dto
        ).pipe(
            map(res => {
                const saved = res.data;
                this.actualizarStorage(saved);
                return saved;
            })
        );
    }



    /** Elimina un formulario por ID */

    eliminarFormulario(id: number): Observable<any> {
        return this._http.delete(`${this.apiUrl}/productos/formularios/${id}`).pipe(
            map(() => {
                this.eliminarDeStorage(id);
                return { code: 200, message: 'Eliminado correctamente' };
            })
        );
    }



    /** Envía una respuesta dinámica a una encuesta de producto */

    responderFormularioDinamico(slug: string, payload: any): Observable<any> {

        return this._http.post(`${this.apiUrl}/productos/formularios/slug/${encodeURIComponent(slug)}/responder`, payload).pipe(

            catchError(() => {

                // Guardar localmente

                const respCache = JSON.parse(localStorage.getItem(this.STORAGE_RESPUESTAS_KEY) || '[]');

                respCache.unshift({

                    id: Date.now(),

                    slug,

                    fechaRegistro: new Date().toISOString(),

                    payload

                });

                localStorage.setItem(this.STORAGE_RESPUESTAS_KEY, JSON.stringify(respCache));

                return of({ code: 200, message: 'Encuesta registrada con éxito (modo local)' });

            })

        );

    }



    /** Obtiene las respuestas registradas para un formulario */
    getRespuestasFormulario(id: number): Observable<FormularioProductoRespuestaDetalleDto[]> {
        return this._http.get<{ code: number; message: string; data: FormularioProductoRespuestaDetalleDto[] }>(
            `${this.apiUrl}/productos/formularios/${id}/respuestas`

        ).pipe(

            map(res => res?.data || []),

            catchError(() => of([]))

        );

    }

    /** Obtiene el listado unificado de respuestas (dinámicas y heredadas) */
    obtenerRespuestasUnificadas(tipo: string = 'todos'): Observable<EncuestaRespuestaResumenDto[]> {
        const params = new HttpParams().set('tipo', tipo || 'todos');
        return this._http.get<EncuestaRespuestaResumenDto[]>(`${environment.apiUrl}/EncuestaRespuestas`, { params });
    }

    /** Obtiene el detalle unificado de una respuesta (dinámica o heredada) */
    obtenerDetalleRespuestaUnificada(origen: string, id: number): Observable<EncuestaRespuestaDetalleDto> {
        return this._http.get<EncuestaRespuestaDetalleDto>(`${environment.apiUrl}/EncuestaRespuestas/${origen}/${id}`);
    }



    // =========================================================================

    // MÉTODOS HEREDADOS (Compatibilidad con el sistema actual)

    // =========================================================================



    /** Obtiene todas las encuestas tradicionales */

    getSurveys(): Observable<any> {

        return this._http.get<any>(`${this.apiUrl}/productos/todas`).pipe(

            catchError(() => of({ code: 200, data: [] }))

        );

    }



    /** Obtiene una encuesta por ID */

    getSurveyById(id: number): Observable<any> {

        return this._http.get<any>(`${this.apiUrl}/productos/${id}`).pipe(

            catchError(() => of({ code: 404, message: 'No encontrada' }))

        );

    }



    // =========================================================================

    // PLANTILLAS PREDETERMINADAS Y ALMACENAMIENTO LOCAL

    // =========================================================================



    public generarCamposPredeterminados(tipo: 'producto' | 'servicio' = 'producto'): CampoConfig[] {

        if (tipo === 'servicio') {

            return this.generarCamposPredeterminadosServicio();

        }

        return this.generarCamposPredeterminadosProducto();

    }



    public generarCamposPredeterminadosProducto(): CampoConfig[] {

        return [

            { id: 'nombre', tipo: 'input', etiqueta: 'Nombre del evaluador', placeholder: 'Tu nombre completo', requerido: true, ancho: 'half', orden: 1, paso: 1 },

            { id: 'empresa', tipo: 'input', etiqueta: 'Empresa u Organización', placeholder: 'Nombre de tu empresa', requerido: false, ancho: 'half', orden: 2, paso: 1 },

            { id: 'email', tipo: 'email', etiqueta: 'Correo Electrónico', placeholder: 'tu.correo@empresa.com', requerido: true, ancho: 'half', orden: 3, paso: 1 },

            { id: 'telefono', tipo: 'tel', etiqueta: 'Teléfono / WhatsApp', placeholder: '+52 (xxx) xxx-xxxx', requerido: false, ancho: 'half', orden: 4, paso: 1 },

            { id: 'cargo', tipo: 'input', etiqueta: 'Puesto o Cargo', placeholder: 'Ej: Jefe de Mantenimiento / Compras', requerido: false, ancho: 'full', orden: 5, paso: 1 },



            {

                id: 'servicioPersonal',

                tipo: 'radio',

                etiqueta: '¿Cómo calificarías el servicio y asesoría del ejecutivo que atendió tu pedido?',

                requerido: true,

                ancho: 'full',

                orden: 6,

                paso: 2,

                escalaNotaInferior: '1 = Pésimo',

                escalaNotaSuperior: '10 = Extraordinario',

                opciones: ['1 - Pésimo', '2 - Muy deficiente', '3 - Deficiente', '4 - Regular', '5 - Aceptable', '6 - Bueno', '7 - Muy bueno', '8 - Notable', '9 - Excelente', '10 - Extraordinario']

            },

            {

                id: 'recomendarProductos',

                tipo: 'radio',

                etiqueta: '¿Qué posibilidades hay de que recomiendes nuestros tableros y productos eléctricos? (NPS)',

                requerido: true,

                ancho: 'full',

                orden: 7,

                paso: 2,

                escalaNotaInferior: '0 = Nada probable',

                escalaNotaSuperior: '10 = Definitivamente sí',

                opciones: ['0 - Nada probable', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10 - Definitivamente sí']

            },

            {

                id: 'ayudaProducto',

                tipo: 'radio',

                etiqueta: '¿En qué medida los tableros y equipos suministrados resolvieron tu necesidad técnica?',

                requerido: true,

                ancho: 'full',

                orden: 8,

                paso: 2,

                opciones: ['1 - No ayudaron', '2', '3', '4', '5 - Medianamente', '6', '7', '8', '9', '10 - Completamente satisfecho']

            },

            {

                id: 'comprensionNecesidades',

                tipo: 'radio',

                etiqueta: '¿El producto cumplió con las especificaciones técnicas requeridas en tu proyecto?',

                requerido: true,

                ancho: 'full',

                orden: 9,

                paso: 2,

                opciones: ['1 - Para nada', '2', '3', '4', '5 - Regular', '6', '7', '8', '9', '10 - Totalmente conforme']

            },

            {

                id: 'tiempoEntrega',

                tipo: 'radio',

                etiqueta: '¿Cómo evalúas la puntualidad de entrega y el embalaje/protección del producto?',

                requerido: true,

                ancho: 'full',

                orden: 10,

                paso: 2,

                opciones: ['1 - Deficiente', '2', '3', '4', '5 - Regular', '6', '7', '8', '9', '10 - Excelente entrega y empaque']

            },



            { id: 'razonServicio', tipo: 'textarea', etiqueta: '¿Podrías compartirnos la razón principal de tu calificación?', placeholder: 'Coméntanos qué podemos hacer aún mejor...', requerido: false, ancho: 'full', orden: 11, paso: 3 },

            { id: 'productosDeseados', tipo: 'textarea', etiqueta: '¿Qué otros productos, tableros o soluciones eléctricas te gustaría cotizar con nosotros?', placeholder: 'Ej: Subestaciones, bancos de capacitores, transformadores...', requerido: false, ancho: 'full', orden: 12, paso: 3 },

            {

                id: 'comoConocio',

                tipo: 'select',

                etiqueta: '¿Cómo conociste a JR Ingeniería Eléctrica?',

                requerido: false,

                ancho: 'full',

                orden: 13,

                paso: 3,

                opciones: [

                    'Recomendación de un colega o cliente',

                    'Búsqueda en Google / Web',

                    'Redes Sociales / LinkedIn',

                    'Expo / Evento Industrial',

                    'Visita comercial de un asesor JR',

                    'Cliente recurrente',

                    'Otro medio'

                ]

            }

        ];

    }



    public generarCamposPredeterminadosServicio(): CampoConfig[] {

        return [

            { id: 'nombre', tipo: 'input', etiqueta: 'Nombre del evaluador', placeholder: 'Tu nombre completo', requerido: true, ancho: 'half', orden: 1, paso: 1 },

            { id: 'empresa', tipo: 'input', etiqueta: 'Empresa o Planta', placeholder: 'Nombre de tu empresa', requerido: false, ancho: 'half', orden: 2, paso: 1 },

            { id: 'email', tipo: 'email', etiqueta: 'Correo Electrónico', placeholder: 'tu.correo@empresa.com', requerido: true, ancho: 'half', orden: 3, paso: 1 },

            { id: 'telefono', tipo: 'tel', etiqueta: 'Teléfono / WhatsApp', placeholder: '+52 (xxx) xxx-xxxx', requerido: false, ancho: 'half', orden: 4, paso: 1 },

            { id: 'puesto', tipo: 'input', etiqueta: 'Puesto o Cargo', placeholder: 'Ej: Superintendente de Mantenimiento / Planta', requerido: false, ancho: 'full', orden: 5, paso: 1 },



            {

                id: 'serviciosRecibidos',

                tipo: 'select',

                etiqueta: 'Tipo de servicio o proyecto ejecutado en tus instalaciones:',

                requerido: true,

                ancho: 'full',

                orden: 6,

                paso: 2,

                opciones: [

                    'Mantenimiento preventivo/correctivo a subestaciones',

                    'Pruebas y diagnósticos a transformadores',

                    'Instalación y comisionamiento de tableros',

                    'Estudios de calidad de energía y Código de Red',

                    'Termografía infrarroja y análisis predictivo',

                    'Montaje electromecánico e ingeniería en campo',

                    'Servicio de emergencia / Soporte técnico'

                ]

            },

            {

                id: 'servicioPersonal',

                tipo: 'radio',

                etiqueta: '¿Cómo calificarías el trato, profesionalismo y atención de nuestros ingenieros y técnicos en sitio?',

                requerido: true,

                ancho: 'full',

                orden: 7,

                paso: 2,

                escalaNotaInferior: '1 = Pésimo',

                escalaNotaSuperior: '10 = Extraordinario',

                opciones: ['1 - Pésimo', '2 - Muy deficiente', '3 - Deficiente', '4 - Regular', '5 - Aceptable', '6 - Bueno', '7 - Muy bueno', '8 - Notable', '9 - Excelente', '10 - Extraordinario']

            },

            {

                id: 'recomendarServicios',

                tipo: 'radio',

                etiqueta: '¿Qué posibilidades hay de que recomiendes nuestros servicios de ingeniería a colegas o empresas? (NPS)',

                requerido: true,

                ancho: 'full',

                orden: 8,

                paso: 2,

                escalaNotaInferior: '0 = Nada probable',

                escalaNotaSuperior: '10 = Definitivamente sí',

                opciones: ['0 - Nada probable', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10 - Definitivamente sí']

            },

            {

                id: 'desarrolloServicios',

                tipo: 'radio',

                etiqueta: '¿Cómo evalúas la capacidad técnica, diagnósticos y ejecución de los trabajos en campo?',

                requerido: true,

                ancho: 'full',

                orden: 9,

                paso: 2,

                opciones: ['1 - Deficiente', '2', '3', '4', '5 - Regular', '6', '7', '8', '9', '10 - Excelente técnica y precisión']

            },

            {

                id: 'calidadTiempo',

                tipo: 'radio',

                etiqueta: '¿Cómo evalúas el cumplimiento en tiempo, cronograma y entrega de reportes del servicio?',

                requerido: true,

                ancho: 'full',

                orden: 10,

                paso: 2,

                opciones: ['1 - Incumplido', '2', '3', '4', '5 - Regular', '6', '7', '8', '9', '10 - Puntual y en tiempo']

            },

            {

                id: 'seguridadIndustrial',

                tipo: 'radio',

                etiqueta: '¿El personal de JR cumplió rigurosamente con normas de seguridad, EPP y protocolos de maniobra?',

                requerido: true,

                ancho: 'full',

                orden: 11,

                paso: 2,

                opciones: ['1 - No cumplió', '2', '3', '4', '5 - Parcial', '6', '7', '8', '9', '10 - Cumplimiento total de seguridad']

            },



            { id: 'mejoras', tipo: 'textarea', etiqueta: '¿Qué áreas de mejora nos recomiendas para nuestros próximos servicios?', placeholder: 'Tus observaciones nos ayudan a elevar nuestra calidad operativa...', requerido: false, ancho: 'full', orden: 12, paso: 3 },

            { id: 'serviciosFuturos', tipo: 'textarea', etiqueta: '¿Qué otros servicios o mantenimientos requerirá tu planta en los próximos meses?', placeholder: 'Ej: Libranzas programadas, modernización de protecciones...', requerido: false, ancho: 'full', orden: 13, paso: 3 },

            {

                id: 'comoConocio',

                tipo: 'select',

                etiqueta: '¿Cómo conociste a JR Ingeniería Eléctrica?',

                requerido: false,

                ancho: 'full',

                orden: 14,

                paso: 3,

                opciones: [

                    'Recomendación de un colega o cliente',

                    'Búsqueda en Google / Web',

                    'Redes Sociales / LinkedIn',

                    'Expo / Evento Industrial',

                    'Visita comercial de un asesor JR',

                    'Cliente recurrente',

                    'Otro medio'

                ]

            }

        ];

    }



    public generarDisenoPredeterminado(tipo: 'producto' | 'servicio' = 'producto'): DisenoConfig {

        if (tipo === 'servicio') {

            return {

                tipoFormulario: 'Satisfaccion',

                modoPasos: true,

                pasos: [

                    { numero: 1, titulo: 'Datos de Contacto', descripcion: 'Información del evaluador' },

                    { numero: 2, titulo: 'Evaluación del Servicio', descripcion: 'Trato técnico, maniobras y cumplimiento' },

                    { numero: 3, titulo: 'Comentarios y Mejoras', descripcion: 'Sugerencias para nuestros proyectos' }

                ],

                colorPrimario: '#0284c7',

                colorFondo: '#f8fafc',

                estiloCard: 'glassmorphism',

                radioBorde: 'rounded-2xl',

                alturaPortada: 'medium',

                botonTexto: 'Enviar Encuesta de Servicio',

                mensajeExito: '¡Muchas gracias por evaluar nuestros servicios de ingeniería! Tu opinión nos ayuda a mantener la máxima excelencia y seguridad en cada proyecto.',

                mostrarQrExito: false,

                temaOscuro: false

            };

        }



        return {

            tipoFormulario: 'Satisfaccion',

            modoPasos: true,

            pasos: [

                { numero: 1, titulo: 'Datos de Contacto', descripcion: 'Información del evaluador' },

                { numero: 2, titulo: 'Evaluación del Producto', descripcion: 'Atención, calidad y tiempos de entrega' },

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

    }



    private obtenerPredeterminadosStorage(): FormularioProductoDto[] {

        const raw = localStorage.getItem(this.STORAGE_KEY);

        if (raw) {

            try {

                const parsed = JSON.parse(raw);

                if (Array.isArray(parsed) && parsed.length > 0) {

                    // Garantizar que las encuestas existentes tengan tipo 'producto'

                    return parsed.map(p => ({

                        ...p,

                        tipo: p.tipo || 'producto'

                    }));

                }

            } catch { }

        }



        const predeterminado: FormularioProductoDto = {

            id: 1,

            slug: 'satisfaccion-productos',

            titulo: 'Encuesta de Satisfacción de Productos y Equipos',

            descripcion: 'En JR Ingeniería Eléctrica valoramos tu opinión. Por favor ayúdanos a evaluar tu experiencia para seguir ofreciéndote la mejor calidad.',

            imagenPortadaUrl: 'assets/images/surveys/tableros-electricos.jpg',

            camposConfigJson: JSON.stringify(this.generarCamposPredeterminadosProducto()),

            disenoConfigJson: JSON.stringify(this.generarDisenoPredeterminado('producto')),

            tipo: 'producto',

            activo: true,

            fechaCreacion: new Date().toISOString(),

            totalRespuestas: 0

        };



        const predeterminadoServicio: FormularioProductoDto = {

            id: 2,

            slug: 'satisfaccion-servicios',

            titulo: 'Encuesta de Satisfacción de Servicios y Proyectos de Ingeniería',

            descripcion: 'Tu evaluación nos permite garantizar los más altos estándares de calidad, seguridad y cumplimiento técnico en servicios de campo.',

            imagenPortadaUrl: 'assets/images/surveys/subestacion-electrica.jpg',

            camposConfigJson: JSON.stringify(this.generarCamposPredeterminadosServicio()),

            disenoConfigJson: JSON.stringify(this.generarDisenoPredeterminado('servicio')),

            tipo: 'servicio',

            activo: true,

            fechaCreacion: new Date().toISOString(),

            totalRespuestas: 0

        };



        const lista = [predeterminado, predeterminadoServicio];

        this.guardarEnStorage(lista);

        return lista;

    }



    private leerListaLocal(clave: string): FormularioProductoDto[] {
        try {
            const datos = JSON.parse(localStorage.getItem(clave) || '[]');
            return Array.isArray(datos) ? datos.filter(f => f && typeof f === 'object') : [];
        } catch {
            return [];
        }
    }

    private claveSlug(slug?: string): string {
        return (slug || '').trim().toLowerCase();
    }

    /** Encuestas del navegador (copia y pendientes) cuyo enlace no está en el servidor, sin las plantillas que nadie modificó. */
    private formulariosSoloLocales(servidor: FormularioProductoDto[]): FormularioProductoDto[] {
        const enServidor = new Set(servidor.map(f => this.claveSlug(f.slug)));
        const vistos = new Set<string>();
        const candidatos = [...this.leerListaLocal(this.STORAGE_PENDIENTES_KEY), ...this.leerListaLocal(this.STORAGE_KEY)];

        return candidatos.filter(f => {
            const slug = this.claveSlug(f.slug);
            if (!slug || !f.titulo || enServidor.has(slug) || vistos.has(slug)) return false;
            vistos.add(slug);
            const plantillaSinModificar = this.SLUGS_PREDETERMINADOS.includes(slug) && !f.fechaModificacion;
            return !plantillaSinModificar;
        });
    }

    private guardarPendientes(lista: FormularioProductoDto[]): void {
        if (lista.length === 0) localStorage.removeItem(this.STORAGE_PENDIENTES_KEY);
        else localStorage.setItem(this.STORAGE_PENDIENTES_KEY, JSON.stringify(lista));
    }

    private paraSubir(f: FormularioProductoDto): FormularioProductoSaveDto {
        return {
            id: 0, // en el servidor es nueva: el id del navegador era inventado
            slug: f.slug,
            titulo: f.titulo,
            descripcion: f.descripcion,
            imagenPortadaUrl: f.imagenPortadaUrl,
            camposConfigJson: f.camposConfigJson || '[]',
            disenoConfigJson: f.disenoConfigJson || '{}',
            tipo: f.tipo === 'servicio' ? 'servicio' : 'producto',
            sucursalId: f.sucursalId,
            activo: !!f.activo
        };
    }

    /**
     * Sube, una tras otra, las encuestas que solo existen en el navegador. Antes de empezar las respalda como pendientes:
     * las que no se puedan subir se conservan y se reintentan en la siguiente carga.
     */
    private subirFormulariosLocales(
        servidor: FormularioProductoDto[],
        locales: FormularioProductoDto[]
    ): Observable<FormularioProductoDto[]> {
        this.guardarPendientes(locales);
        const creados: FormularioProductoDto[] = [];
        const fallidos: FormularioProductoDto[] = [];

        return from(locales).pipe(
            concatMap(local =>
                this._http.post<{ code: number; message: string; data: FormularioProductoDto }>(
                    `${this.apiUrl}/productos/formularios`, this.paraSubir(local)
                ).pipe(
                    map(res => {
                        if (res?.data) creados.push(res.data);
                        else fallidos.push(local);
                    }),
                    catchError(() => {
                        fallidos.push(local);
                        return of(undefined);
                    })
                )
            ),
            toArray(),
            map(() => {
                const lista = [...servidor, ...creados];
                this.reemplazarCopiaConLaDelServidor(lista);
                this.guardarPendientes(fallidos);
                this.recuperados$.next({ titulos: creados.map(c => c.titulo), pendientes: fallidos.length });
                return lista;
            })
        );
    }

    private firmaDeFormulario(f: FormularioProductoDto): string {
        return JSON.stringify([
            this.claveSlug(f.slug), f.titulo, f.descripcion, f.activo, f.tipo, f.camposConfigJson, f.disenoConfigJson, f.imagenPortadaUrl
        ]);
    }

    private leerJsonLocal<T>(clave: string): T[] {
        try {
            const datos = JSON.parse(localStorage.getItem(clave) || '[]');
            return Array.isArray(datos) ? datos : [];
        } catch {
            return [];
        }
    }

    /**
     * Reemplaza la copia del navegador por la lista del servidor, pero primero respalda (máx. 5 veces) lo de la copia
     * que no es idéntico a lo del servidor ni es una copia anterior del servidor: es decir, lo creado o editado en este navegador.
     * El respaldo es un extra: si falla (almacenamiento lleno), la carga de la lista continúa.
     */
    private reemplazarCopiaConLaDelServidor(lista: FormularioProductoDto[]): void {
        const firmasDelServidor = lista.map(f => this.firmaDeFormulario(f));
        try {
            const noLoDelServidor = new Set([...firmasDelServidor, ...this.leerJsonLocal<string>(this.STORAGE_SINCRONIZADO_KEY)]);
            // Sin excepciones para las plantillas predeterminadas: respaldar de más cuesta un hueco de los 5; respaldar de menos, perder trabajo.
            const enRiesgo = this.leerListaLocal(this.STORAGE_KEY).filter(
                f => !!this.claveSlug(f.slug) && !noLoDelServidor.has(this.firmaDeFormulario(f))
            );
            if (enRiesgo.length > 0) {
                const respaldos = [{ fecha: new Date().toISOString(), formularios: enRiesgo }, ...this.leerJsonLocal<unknown>(this.STORAGE_RESPALDO_KEY)];
                localStorage.setItem(this.STORAGE_RESPALDO_KEY, JSON.stringify(respaldos.slice(0, this.MAX_RESPALDOS)));
            }
        } catch {
            /* sin espacio para el respaldo: no impide cargar la lista */
        }
        this.guardarEnStorage(lista);
        try {
            localStorage.setItem(this.STORAGE_SINCRONIZADO_KEY, JSON.stringify(firmasDelServidor));
        } catch {
            /* sin espacio: solo habrá un respaldo de más la próxima vez */
        }
    }

    private guardarEnStorage(lista: FormularioProductoDto[]): void {

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lista));

    }



    private actualizarStorage(form: FormularioProductoDto): void {

        const lista = this.obtenerPredeterminadosStorage();

        const idx = lista.findIndex(x => x.id === form.id);

        if (idx !== -1) {

            lista[idx] = form;

        } else {

            lista.unshift(form);

        }

        this.guardarEnStorage(lista);

    }



    private eliminarDeStorage(id: number): void {

        const lista = this.obtenerPredeterminadosStorage().filter(x => x.id !== id);

        this.guardarEnStorage(lista);

    }


    /** Descarga y extrae el texto estructurado de una URL de Google Docs o enlace web */
    descargarContenidoUrl(url: string): Observable<{ contenido: string; urlProcesada?: string }> {
        return this._http.post<{ contenido: string; urlProcesada?: string }>(
            `${environment.apiUrl}/FormulariosRegistro/descargar-contenido-url`, { url }
        ).pipe(
            catchError(err => {
                console.error('Error al descargar contenido URL:', err);
                throw err;
            })
        );
    }

    /** Extrae el texto estructurado de un archivo subido (.docx o .txt) */
    extraerContenidoArchivo(archivo: File): Observable<{ contenido: string; nombreArchivo?: string }> {
        const formData = new FormData();
        formData.append('archivo', archivo, archivo.name);
        return this._http.post<{ contenido: string; nombreArchivo?: string }>(
            `${environment.apiUrl}/FormulariosRegistro/extraer-contenido-archivo`, formData
        ).pipe(
            catchError(err => {
                console.error('Error al extraer contenido de archivo:', err);
                throw err;
            })
        );
    }


}