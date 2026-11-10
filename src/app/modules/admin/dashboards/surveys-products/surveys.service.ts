import { Injectable, inject } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable, catchError, map, of } from 'rxjs';

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



    constructor() {
        this.limpiarLocalStorageHeredado();
    }

    /** Limpia cualquier rastro de encuestas almacenadas en localStorage de versiones anteriores */
    limpiarLocalStorageHeredado(): void {
        try {
            const claves = [
                'jr_formularios_productos_cache',
                'jr_formularios_productos_pendientes',
                'jr_formularios_productos_respaldo',
                'jr_formularios_productos_sincronizado',
                'jr_respuestas_productos_cache'
            ];
            claves.forEach(clave => localStorage.removeItem(clave));
        } catch { }
    }

    // =========================================================================
    // CONFIGURACIÓN DE FORMULARIOS DE PRODUCTOS (Estilo Configurador)
    // =========================================================================

    /** Obtiene todos los formularios de encuestas de productos configurados */
    getFormularios(): Observable<FormularioProductoDto[]> {
        return this._http.get<{ code: number; message: string; data: FormularioProductoDto[] }>(
            `${this.apiUrl}/productos/formularios`
        ).pipe(
            map(res => res?.data ?? [])
        );
    }

    /** Obtiene un formulario por su ID */
    getFormularioById(id: number): Observable<FormularioProductoDto | null> {
        return this._http.get<{ code: number; message: string; data: FormularioProductoDto }>(
            `${this.apiUrl}/productos/formularios/${id}`
        ).pipe(
            map(res => res?.data || null)
        );
    }

    /** Obtiene un formulario por su Slug para la vista pública */
    getFormularioBySlug(slug: string): Observable<FormularioProductoDto | null> {
        const cleanSlug = (slug || '').trim().toLowerCase();
        return this._http.get<{ code: number; message: string; data: FormularioProductoDto }>(
            `${this.apiUrl}/productos/formularios/slug/${encodeURIComponent(cleanSlug)}`
        ).pipe(
            map(res => res?.data || null)
        );
    }

    /** Guarda o actualiza un formulario */
    guardarFormulario(dto: FormularioProductoSaveDto): Observable<FormularioProductoDto> {
        return this._http.post<{ code: number; message: string; data: FormularioProductoDto }>(
            `${this.apiUrl}/productos/formularios`, dto
        ).pipe(
            map(res => res.data)
        );
    }

    /** Elimina un formulario por ID */
    eliminarFormulario(id: number): Observable<any> {
        return this._http.delete(`${this.apiUrl}/productos/formularios/${id}`);
    }

    /** Envía una respuesta dinámica a una encuesta de producto */
    responderFormularioDinamico(slug: string, payload: any): Observable<any> {
        return this._http.post(`${this.apiUrl}/productos/formularios/slug/${encodeURIComponent(slug)}/responder`, payload);
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