import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface CampoConfig {
    id: string;
    tipo: 'input' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'tel';
    etiqueta: string;
    placeholder?: string;
    requerido: boolean;
    opciones?: string[];
    ancho?: 'full' | 'half';
    campoEstandar?: string; // Mapeo automático (Nombre, Apellidos, Correo, Telefono, Empresa, etc.)
    orden: number;
}

export interface DisenoConfig {
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
    activo: boolean;
}

export interface RegistroPublicoResultadoDto {
    exito: boolean;
    mensaje: string;
    asistenteId?: number;
    tokenQR?: string;
    nombreCompleto?: string;
    correoElectronico?: string;
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
}
