import { ReporteFormulario } from '../../eventos/reporte-respuestas/reporte-respuestas.types';

export interface FormularioReporteResumenDto {
    id: number;
    titulo: string;
    activo: boolean;
    totalRespuestas: number;
    ultimaRespuesta: string | null;
}

export interface ReporteEncuestaDetalleDto {
    formularioTipo: 'producto' | 'servicio';
    calificacionPromedio: number | null;
    reporte: ReporteFormulario;
}

