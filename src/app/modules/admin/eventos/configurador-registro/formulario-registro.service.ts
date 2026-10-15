import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    dependeDeCampoId?: string;
    dependeDeValor?: string;
    dependeDeOperador?: 'equals' | 'contains';
}

export interface CampoConfig {
    id: string;
    tipo: 'input' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'tel' | 'file' | 'matrix' | 'section';
    etiqueta: string;
    placeholder?: string;
    requerido: boolean;
    opciones?: string[];
    ancho?: 'full' | 'half';
    campoEstandar?: string; // Mapeo automático (Nombre, Apellidos, Correo, Telefono, Empresa, etc.)
    orden: number;
    paso?: number; // Número de paso en el wizard (1, 2, 3...)
    dependeDeCampoId?: string;
    dependeDeValor?: string;
    dependeDeOperador?: 'equals' | 'contains'; // Si el campo padre es selección múltiple (checkbox) o texto
    // Configuración para tipo 'matrix' (Matriz de Escala Likert 1 al 5)
    filasMatriz?: FilaMatrizConfig[];
    columnasMatriz?: ColumnaMatrizConfig[];
    escalaNotaInferior?: string; // Ej: "1 = Muy insatisfecho(a)"
    escalaNotaSuperior?: string; // Ej: "5 = Muy satisfecho(a)"
}

export interface DisenoConfig {
    tipoFormulario?: 'Registro' | 'Satisfaccion'; // Tipo de formulario: Registro (con QR) o Satisfacción (sin QR)
    modoPasos?: boolean; // Habilitar formulario por pasos / wizard
    pasos?: PasoFormularioConfig[]; // Lista de pasos configurados
    colorPrimario: string; // ej. '#1e8449'
    colorFondo: string;    // ej. '#0f172a' o '#f8fafc'
    estiloCard: 'solid' | 'glassmorphism' | 'bordered';
    radioBorde: 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
    alturaPortada: 'compact' | 'medium' | 'tall';
    botonTexto: string;
    mensajeExito: string;
    mostrarQrExito: boolean;
    temaOscuro: boolean;
}

export interface FormularioRegistroAdminDto {
    id: number;
    eventoId: number;
    nombreEvento?: string;
    slug: string;
    titulo: string;
    descripcion?: string;
    imagenPortadaUrl?: string;
    camposConfigJson: string;
    disenoConfigJson: string;
    moduloDestino: string;
    activo: boolean;
    fechaCreacion: string;
    fechaModificacion?: string;
    totalRespuestas: number;
}

export interface FormularioRegistroSaveDto {
    id: number;
    eventoId: number;
    slug: string;
    titulo: string;
    descripcion?: string;
    imagenPortadaUrl?: string;
    camposConfigJson: string;
    disenoConfigJson: string;
    moduloDestino: string;
    activo: boolean;
}

export interface FormularioRegistroPublicoDto {
    id: number;
    eventoId: number;
    nombreEvento: string;
    slug: string;
    titulo: string;
    descripcion?: string;
    imagenPortadaUrl?: string;
    camposConfigJson: string;
    disenoConfigJson: string;
    moduloDestino: string;
    activo: boolean;
}

export interface RegistroPublicoResultadoDto {
    exito: boolean;
    mensaje: string;
    asistenteId?: number;
    personalStaffId?: number;
    tokenQR?: string;
    nombreCompleto?: string;
    correoElectronico?: string;
    emailEnviado?: boolean;
    whatsappEnviado?: boolean;
}

export interface FormularioRespuestaDetalleDto {
    id: number;
    formularioId: number;
    eventoId: number;
    asistenteId?: number;
    nombreAsistente?: string;
    correoAsistente?: string;
    telefonoAsistente?: string;
    respuestasJson: string;
    fechaRegistro: string;
    ipOrigen?: string;
}

@Injectable({
    providedIn: 'root'
})
export class FormularioRegistroService {
    private _http = inject(HttpClient);
    private readonly api = `${environment.apiUrl}/FormulariosRegistro`;

    /** Obtiene el listado de todos los formularios configurados (Admin) */
    getTodos(): Observable<FormularioRegistroAdminDto[]> {
        return this._http.get<FormularioRegistroAdminDto[]>(this.api);
    }

    /** Obtiene un formulario por su ID (Admin) */
    getPorId(id: number): Observable<FormularioRegistroAdminDto> {
        return this._http.get<FormularioRegistroAdminDto>(`${this.api}/${id}`);
    }

    /** Elimina un formulario por su ID (Admin) */
    eliminar(id: number): Observable<any> {
        return this._http.delete(`${this.api}/${id}`);
    }

    /** Obtiene la configuración del formulario para un evento (Admin) */
    getPorEvento(eventoId: number): Observable<FormularioRegistroAdminDto | null> {
        return this._http.get<FormularioRegistroAdminDto | null>(`${this.api}/evento/${eventoId}`);
    }

    /** Guarda o actualiza la configuración (Admin) */
    guardarConfiguracion(dto: FormularioRegistroSaveDto): Observable<FormularioRegistroAdminDto> {
        return this._http.post<FormularioRegistroAdminDto>(this.api, dto);
    }

    /** Carga el formulario público por slug (Público) */
    getPublicoPorSlug(slug: string): Observable<FormularioRegistroPublicoDto> {
        return this._http.get<FormularioRegistroPublicoDto>(`${this.api}/publico/${slug}`);
    }

    /** Envía las respuestas públicas para registrar al asistente (Público) */
    responderPublico(slug: string, payload: any): Observable<RegistroPublicoResultadoDto> {
        return this._http.post<RegistroPublicoResultadoDto>(`${this.api}/publico/${slug}/responder`, payload);
    }

    /** Obtiene el historial de respuestas del evento (Admin) */
    getRespuestasPorEvento(eventoId: number): Observable<FormularioRespuestaDetalleDto[]> {
        return this._http.get<FormularioRespuestaDetalleDto[]>(`${this.api}/evento/${eventoId}/respuestas`);
    }

    /** Verifica si un slug está disponible */
    validarSlug(slug: string, formularioId?: number): Observable<{ disponible: boolean; slug: string }> {
        const params = formularioId ? `?slug=${encodeURIComponent(slug)}&formularioId=${formularioId}` : `?slug=${encodeURIComponent(slug)}`;
        return this._http.get<{ disponible: boolean; slug: string }>(`${this.api}/validar-slug${params}`);
    }

    /** Envía el formulario masivamente a los destinatarios seleccionados */
    enviarMasivo(formularioId: number, dto: EnvioMasivoFormularioRequestDto): Observable<EnvioMasivoResultadoDto> {
        return this._http.post<EnvioMasivoResultadoDto>(`${this.api}/${formularioId}/enviar-masivo`, dto);
    }

    /** Obtiene el historial de envíos de un formulario */
    getHistorialEnvios(formularioId: number): Observable<FormularioEnvioHistorialDto[]> {
        return this._http.get<FormularioEnvioHistorialDto[]>(`${this.api}/${formularioId}/envios-historial`);
    }

    /** Descarga el texto de un documento público por URL (Google Docs o web) */
    descargarContenidoUrl(url: string): Observable<{ contenido: string; urlProcesada: string }> {
        return this._http.post<{ contenido: string; urlProcesada: string }>(`${this.api}/descargar-contenido-url`, { url });
    }

    /** Extrae el texto estructurado de un archivo subido (.docx o .txt) */
    extraerContenidoArchivo(archivo: File): Observable<{ contenido: string; nombreArchivo: string }> {
        const formData = new FormData();
        formData.append('archivo', archivo, archivo.name);
        return this._http.post<{ contenido: string; nombreArchivo: string }>(`${this.api}/extraer-contenido-archivo`, formData);
    }
}

export interface DestinatarioItemEnvioDto {
    asistenteId?: number;
    personalStaffId?: number;
    usuarioId?: number;
    nombre: string;
    email: string;
    telefono?: string;
    rolCargo?: string;
    organizacion?: string;
}

export interface EnvioMasivoFormularioRequestDto {
    asunto?: string;
    mensajeAdicional?: string;
    urlBase?: string;
    destinatarios: DestinatarioItemEnvioDto[];
}

/** Destinatario al que no se pudo notificar por correo o WhatsApp, con el motivo de cada canal */
export interface EnvioMasivoFalloDto {
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    /** Por qué no se envió el correo; null si salió bien */
    motivoCorreo?: string | null;
    /** Por qué no se envió el WhatsApp; null si salió bien o no hacía falta intentarlo */
    motivoWhatsapp?: string | null;
    correoEnviado: boolean;
    whatsappEnviado: boolean;
}

export interface EnvioMasivoResultadoDto {
    totalProcesados: number;
    enviadosExitosos: number;
    whatsappExitosos: number;
    /** Correos que no se pudieron enviar */
    fallidos: number;
    /** WhatsApps que se intentaron y fallaron (el API anterior no lo enviaba) */
    whatsappFallidos?: number;
    detalleErrores: string[];
    /** Detalle por destinatario (el API anterior no lo enviaba) */
    fallos?: EnvioMasivoFalloDto[];
}

export interface FormularioEnvioHistorialDto {
    id: number;
    formularioId: number;
    eventoId: number;
    moduloDestino: string;
    asistenteId?: number;
    personalStaffId?: number;
    usuarioId?: number;
    nombreDestinatario: string;
    emailDestinatario: string;
    telefonoDestinatario?: string;
    canal: string;
    estadoEnvio: string;
    whatsappEnviado?: boolean;
    whatsappError?: string;
    errorMensaje?: string;
    fechaEnvio: string;
    respondio: boolean;
    fechaRespuesta?: string;
    reenvios: number;
}

