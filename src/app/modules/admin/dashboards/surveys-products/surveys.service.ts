import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    tipo: 'input' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'tel' | 'matrix' | 'section';
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
    sucursalId?: number;
    activo: boolean;
}

export interface FormularioProductoRespuestaDetalleDto {
    id: number;
    formularioId: number;
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

@Injectable({
    providedIn: 'root'
})
export class SurveysProductsService {
    private _http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/Encuesta`;

    private readonly STORAGE_KEY = 'jr_formularios_productos_cache';
    private readonly STORAGE_RESPUESTAS_KEY = 'jr_respuestas_productos_cache';

    // =========================================================================
    // CONFIGURACIÓN DE FORMULARIOS DE PRODUCTOS (Estilo Configurador)
    // =========================================================================

    /** Obtiene todos los formularios de encuestas de productos configurados */
    getFormularios(): Observable<FormularioProductoDto[]> {
        return this._http.get<{ code: number; message: string; data: FormularioProductoDto[] }>(
            `${this.apiUrl}/productos/formularios`
        ).pipe(
            map(res => {
                if (res && res.data && res.data.length > 0) {
                    this.guardarEnStorage(res.data);
                    return res.data;
                }
                return this.obtenerPredeterminadosStorage();
            }),
            catchError(() => {
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
        return this._http.post<{ code: number; message: string; data: FormularioProductoDto }>(
            `${this.apiUrl}/productos/formularios`, dto
        ).pipe(
            map(res => {
                const saved = res.data;
                this.actualizarStorage(saved);
                return saved;
            }),
            catchError(() => {
                // Fallback local
                const lista = this.obtenerPredeterminadosStorage();
                let saved: FormularioProductoDto;
                if (dto.id > 0) {
                    const idx = lista.findIndex(x => x.id === dto.id);
                    saved = {
                        ...dto,
                        fechaCreacion: idx !== -1 ? lista[idx].fechaCreacion : new Date().toISOString(),
                        fechaModificacion: new Date().toISOString(),
                        totalRespuestas: idx !== -1 ? lista[idx].totalRespuestas : 0
                    };
                    if (idx !== -1) lista[idx] = saved;
                    else lista.unshift(saved);
                } else {
                    const nuevoId = lista.length > 0 ? Math.max(...lista.map(x => x.id)) + 1 : 1;
                    saved = {
                        ...dto,
                        id: nuevoId,
                        fechaCreacion: new Date().toISOString(),
                        totalRespuestas: 0
                    };
                    lista.unshift(saved);
                }
                this.guardarEnStorage(lista);
                return of(saved);
            })
        );
    }

    /** Elimina un formulario por ID */
    eliminarFormulario(id: number): Observable<any> {
        return this._http.delete(`${this.apiUrl}/productos/formularios/${id}`).pipe(
            map(() => {
                this.eliminarDeStorage(id);
                return { code: 200, message: 'Eliminado correctamente' };
            }),
            catchError(() => {
                this.eliminarDeStorage(id);
                return of({ code: 200, message: 'Eliminado localmente' });
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

    public generarCamposPredeterminados(): CampoConfig[] {
        return [
            { id: 'nombre', tipo: 'input', etiqueta: 'Nombre del evaluador', placeholder: 'Tu nombre completo', requerido: true, ancho: 'half', orden: 1, paso: 1 },
            { id: 'empresa', tipo: 'input', etiqueta: 'Empresa u Organización', placeholder: 'Nombre de tu empresa', requerido: false, ancho: 'half', orden: 2, paso: 1 },
            { id: 'email', tipo: 'email', etiqueta: 'Correo Electrónico', placeholder: 'tu.correo@empresa.com', requerido: true, ancho: 'half', orden: 3, paso: 1 },
            { id: 'telefono', tipo: 'tel', etiqueta: 'Teléfono / WhatsApp', placeholder: '+52 (xxx) xxx-xxxx', requerido: false, ancho: 'half', orden: 4, paso: 1 },
            { id: 'cargo', tipo: 'input', etiqueta: 'Puesto o Cargo', placeholder: 'Ej: Jefe de Mantenimiento / Compras', requerido: false, ancho: 'full', orden: 5, paso: 1 },

            {
                id: 'servicioPersonal',
                tipo: 'radio',
                etiqueta: '¿Cómo calificarías el servicio y atención del personal que te atendió?',
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
                etiqueta: '¿Qué posibilidades hay de que recomiendes nuestros productos y servicios? (NPS)',
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
                etiqueta: '¿En qué medida los productos y tableros ayudaron a resolver tu problema?',
                requerido: true,
                ancho: 'full',
                orden: 8,
                paso: 2,
                opciones: ['1 - No ayudaron', '2', '3', '4', '5 - Ayudaron medianamente', '6', '7', '8', '9', '10 - Resolvieron completamente']
            },
            {
                id: 'comprensionNecesidades',
                tipo: 'radio',
                etiqueta: '¿Nuestro equipo técnico comprendió tus requerimientos y especificaciones?',
                requerido: true,
                ancho: 'full',
                orden: 9,
                paso: 2,
                opciones: ['1 - Para nada', '2', '3', '4', '5 - Regular', '6', '7', '8', '9', '10 - Totalmente comprendidas']
            },
            {
                id: 'tiempoEntrega',
                tipo: 'radio',
                etiqueta: '¿Cómo evalúas la calidad del producto y el cumplimiento en tiempo de entrega?',
                requerido: true,
                ancho: 'full',
                orden: 10,
                paso: 2,
                opciones: ['1 - Deficiente', '2', '3', '4', '5 - Regular', '6', '7', '8', '9', '10 - Excelente calidad y puntualidad']
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

    public generarDisenoPredeterminado(): DisenoConfig {
        return {
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
    }

    private obtenerPredeterminadosStorage(): FormularioProductoDto[] {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch { }
        }

        const predeterminado: FormularioProductoDto = {
            id: 1,
            slug: 'satisfaccion-productos',
            titulo: 'Encuesta de Satisfacción de Productos y Servicios',
            descripcion: 'En JR Ingeniería Eléctrica valoramos tu opinión. Por favor ayúdanos a evaluar tu experiencia para seguir ofreciéndote la mejor calidad.',
            imagenPortadaUrl: 'assets/images/cards/08-320x200.jpg',
            camposConfigJson: JSON.stringify(this.generarCamposPredeterminados()),
            disenoConfigJson: JSON.stringify(this.generarDisenoPredeterminado()),
            activo: true,
            fechaCreacion: new Date().toISOString(),
            totalRespuestas: 0
        };

        const lista = [predeterminado];
        this.guardarEnStorage(lista);
        return lista;
    }

    private guardarEnStorage(lista: FormularioProductoDto[]): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lista));
    }

    private actualizarStorage(form: FormularioProductoDto): void {
        const lista = this.obtenerPredeterminadosStorage();
        const idx = lista.findIndex(x => x.id === form.id || x.slug === form.slug);
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
}