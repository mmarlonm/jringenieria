export type TipoPregunta = 'opcion' | 'multiple' | 'matriz' | 'numero' | 'abierta' | 'solo-conteo';

export interface ReporteFormulario {
  formularioId: number;
  titulo: string;
  eventoId: number;
  nombreEvento: string | null;
  resumen: ResumenReporte;
  secciones: SeccionReporte[];
}

export interface ResumenReporte {
  totalRespuestas: number;
  completitudPromedio: number;
  tasaRespuesta: number | null;
  ultimaRespuesta: string | null;
  porDia: RespuestasDia[];
}

export interface RespuestasDia {
  fecha: string;
  total: number;
}

export interface SeccionReporte {
  titulo: string | null;
  preguntas: PreguntaReporte[];
}

export interface PreguntaReporte {
  campoId: string;
  etiqueta: string;
  tipo: TipoPregunta;
  base: number;
  opciones: OpcionReporte[] | null;
  matriz: MatrizReporte | null;
  numerico: NumericoReporte | null;
  abiertas: RespuestaAbierta[] | null;
}

export interface OpcionReporte {
  etiqueta: string;
  total: number;
  porcentaje: number;
}

export interface MatrizReporte {
  columnas: ColumnaMatrizReporte[];
  filas: FilaMatrizReporte[];
}

export interface ColumnaMatrizReporte {
  valor: string;
  etiqueta: string;
}

export interface FilaMatrizReporte {
  id: string;
  texto: string;
  base: number;
  conteos: number[];
  porcentajes: number[];
  promedio: number | null;
  topDos: number | null;
}

export interface NumericoReporte {
  minimo: number;
  maximo: number;
  promedio: number;
  mediana: number;
  rangos: RangoReporte[];
}

export interface RangoReporte {
  desde: number;
  hasta: number;
  total: number;
}

export interface RespuestaAbierta {
  fecha: string;
  texto: string;
}
