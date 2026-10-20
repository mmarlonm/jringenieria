import * as Highcharts from 'highcharts';
import { PreguntaReporte, ResumenReporte } from './reporte-respuestas.types';

export const BASE_THEME: Highcharts.Options = {
  accessibility: { enabled: false },
  exporting: { enabled: false },
  chart: {
    backgroundColor: 'transparent',
    spacingBottom: 20,
    spacingTop: 10,
    spacingLeft: 10,
    spacingRight: 10,
    style: {
      fontFamily: 'Inter, sans-serif'
    }
  },
  title: {
    text: undefined
  },
  credits: {
    enabled: false
  },
  legend: {
    itemStyle: {
      color: '#4b5563',
      fontWeight: 'bold',
      fontSize: '11px'
    },
    margin: 10,
    padding: 5
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    style: {
      color: '#1f2937'
    },
    borderColor: '#e5e7eb',
    borderRadius: 12,
    shadow: true,
    padding: 12
  }
};

const ETIQUETA_EJE = { fontSize: '11px', fontWeight: 'bold', color: '#4b5563' };
const ETIQUETA_VALOR = { fontSize: '11px', color: '#4b5563' };
const ETIQUETA_DATO = { color: '#1f2937', fontSize: '11px', fontWeight: 'bold', textOutline: 'none' };

const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return [r, g, b];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const colorDeNivel = (indice: number, total: number): string => {
  const colors = [
    hexToRgb('#ef4444'), // Rojo
    hexToRgb('#f59e0b'), // Naranja
    hexToRgb('#94a3b8'), // Gris
    hexToRgb('#34d399'), // Verde claro
    hexToRgb('#10b981')  // Verde oscuro
  ];

  if (total <= 1) {
    return rgbToHex(...colors[4]);
  }

  const clampedIndice = Math.max(0, Math.min(indice, total - 1));
  const normalizedPosition = clampedIndice / (total - 1);

  const segmentLength = 1 / (colors.length - 1);
  const segmentIndex = Math.floor(normalizedPosition / segmentLength);
  const segmentProgress = (normalizedPosition % segmentLength) / segmentLength;

  const startColor = colors[segmentIndex];
  const endColor = colors[Math.min(segmentIndex + 1, colors.length - 1)];

  const interpolatedColor: [number, number, number] = [
    startColor[0] + (endColor[0] - startColor[0]) * segmentProgress,
    startColor[1] + (endColor[1] - startColor[1]) * segmentProgress,
    startColor[2] + (endColor[2] - startColor[2]) * segmentProgress
  ];

  return rgbToHex(...interpolatedColor);
};

interface OpcionPoint extends Highcharts.Point {
  custom: {
    porcentaje: number;
  };
}

export const opcionesBarras = (p: PreguntaReporte): Highcharts.Options => {
  const opciones = p.opciones ?? [];

  return {
    ...BASE_THEME,
    chart: {
      ...BASE_THEME.chart,
      type: 'bar'
    },
    legend: {
      enabled: false
    },
    xAxis: {
      categories: opciones.map(o => o.etiqueta),
      labels: { style: ETIQUETA_EJE }
    },
    yAxis: {
      min: 0,
      maxPadding: 0.2,
      title: {
        text: undefined
      },
      allowDecimals: false,
      labels: { style: ETIQUETA_VALOR }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        maxPointWidth: 28
      },
      series: {
        dataLabels: {
          enabled: true,
          crop: false,
          overflow: 'allow',
          formatter: function() {
            const point = this.point as OpcionPoint;
            return `${point.y} · ${point.custom.porcentaje.toFixed(1)}%`;
          },
          style: ETIQUETA_DATO
        }
      }
    },
    tooltip: {
      formatter: function() {
        const point = this.point as OpcionPoint;
        return `<b>${point.category}</b>: ${point.y} (${point.custom.porcentaje.toFixed(1)}%)`;
      }
    },
    series: [{
      type: 'bar',
      data: opciones.map(o => ({
        y: o.total,
        color: o.etiqueta.toLowerCase() === 'otros' ? '#94a3b8' : '#4f46e5',
        custom: {
          porcentaje: o.porcentaje
        }
      }))
    }]
  };
};

interface MatrizPoint extends Highcharts.Point {
  custom: {
    porcentaje: number;
  };
}

export const opcionesNiveles = (p: PreguntaReporte): Highcharts.Options => {
  const matriz = p.matriz;
  const filas = matriz?.filas ?? [];
  const columnas = matriz?.columnas ?? [];

  const series: Highcharts.SeriesOptionsType[] = columnas.map((columna, colIndex) => ({
    type: 'bar',
    name: columna.etiqueta,
    color: colorDeNivel(colIndex, columnas.length),
    data: filas.map(fila => {
      const conteo = fila.conteos[colIndex] ?? 0;
      const porcentaje = fila.porcentajes[colIndex] ?? 0;
      return {
        y: conteo,
        custom: {
          porcentaje: porcentaje
        }
      };
    })
  }));

  return {
    ...BASE_THEME,
    chart: {
      ...BASE_THEME.chart,
      type: 'bar'
    },
    legend: {
      ...BASE_THEME.legend,
      enabled: true,
      layout: 'horizontal',
      align: 'center',
      verticalAlign: 'bottom'
    },
    xAxis: {
      categories: filas.map(f => f.texto),
      labels: { style: ETIQUETA_EJE }
    },
    yAxis: {
      min: 0,
      reversedStacks: false,
      title: {
        text: undefined
      },
      labels: {
        formatter: function() {
          return `${this.value}%`;
        },
        style: ETIQUETA_VALOR
      }
    },
    plotOptions: {
      bar: {
        maxPointWidth: 28
      },
      series: {
        stacking: 'percent',
        dataLabels: {
          enabled: true,
          formatter: function() {
            return this.y && this.y > 0 ? this.y.toString() : '';
          },
          style: ETIQUETA_DATO
        }
      }
    },
    tooltip: {
      formatter: function() {
        const point = this.point as MatrizPoint;
        const seriesName = this.series.name;
        const category = this.x;
        const percentage = point.custom.porcentaje;

        return `<b>${category} · ${seriesName}</b>: ${point.y} (${percentage.toFixed(1)}%)`;
      }
    },
    series: series
  };
};

export const opcionesPromedios = (p: PreguntaReporte): Highcharts.Options | null => {
  const matriz = p.matriz;
  if (!matriz) {
    return null;
  }

  const filasConPromedio = matriz.filas.filter(f => f.promedio !== null && f.promedio !== undefined)
    .sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0));

  if (filasConPromedio.length === 0) {
    return null;
  }

  const columnValues = matriz.columnas.map(c => Number(c.valor)).filter(v => !isNaN(v));
  const maxYAxis = columnValues.length > 0 ? Math.max(...columnValues) : undefined;

  return {
    ...BASE_THEME,
    chart: {
      ...BASE_THEME.chart,
      type: 'bar'
    },
    legend: {
      enabled: false
    },
    xAxis: {
      categories: filasConPromedio.map(f => f.texto),
      reversed: false,
      labels: { style: ETIQUETA_EJE }
    },
    yAxis: {
      min: 0,
      max: maxYAxis,
      title: {
        text: undefined
      },
      labels: { style: ETIQUETA_VALOR }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        maxPointWidth: 28
      },
      series: {
        dataLabels: {
          enabled: true,
          formatter: function() {
            return this.y?.toFixed(2) ?? '';
          },
          style: ETIQUETA_DATO
        }
      }
    },
    tooltip: {
      formatter: function() {
        return `<b>${this.x}</b>: ${this.y?.toFixed(2) ?? 'N/A'}`;
      }
    },
    series: [{
      type: 'bar',
      color: '#4f46e5',
      data: filasConPromedio.map(f => f.promedio)
    }]
  };
};

const formatNumber = (num: number): string => {
  return parseFloat(num.toFixed(2)).toString();
};

export const opcionesRangos = (p: PreguntaReporte): Highcharts.Options => {
  const numerico = p.numerico;
  const rangos = numerico?.rangos ?? [];

  return {
    ...BASE_THEME,
    chart: {
      ...BASE_THEME.chart,
      type: 'column'
    },
    legend: {
      enabled: false
    },
    xAxis: {
      categories: rangos.map(r => `${formatNumber(r.desde)} – ${formatNumber(r.hasta)}`),
      labels: { style: ETIQUETA_EJE }
    },
    yAxis: {
      min: 0,
      title: {
        text: undefined
      },
      allowDecimals: false,
      labels: { style: ETIQUETA_VALOR }
    },
    plotOptions: {
      column: {
        borderRadius: 4
      },
      series: {
        dataLabels: {
          enabled: true,
          formatter: function() {
            return this.y?.toString() ?? '';
          },
          style: ETIQUETA_DATO
        }
      }
    },
    tooltip: {
      formatter: function() {
        return `<b>${this.x}</b>: ${this.y} respuestas`;
      }
    },
    series: [{
      type: 'column',
      color: '#0284c7',
      data: rangos.map(r => r.total)
    }]
  };
};

export const opcionesPorDia = (r: ResumenReporte): Highcharts.Options => {
  const porDia = r.porDia ?? [];
  const showDataLabels = porDia.length <= 31;

  return {
    ...BASE_THEME,
    chart: {
      ...BASE_THEME.chart,
      type: 'line',
      height: 320
    },
    legend: {
      enabled: false
    },
    xAxis: {
      categories: porDia.map(d => {
        const datePart = d.fecha.substring(0, 10);
        const parts = datePart.split('-');
        return `${parts[2]}/${parts[1]}`;
      }),
      labels: { style: ETIQUETA_EJE }
    },
    yAxis: {
      min: 0,
      title: {
        text: undefined
      },
      allowDecimals: false,
      labels: { style: ETIQUETA_VALOR }
    },
    plotOptions: {
      series: {
        marker: {
          enabled: true,
          radius: 5,
          symbol: 'circle'
        },
        dataLabels: {
          enabled: showDataLabels,
          formatter: function() {
            return this.y?.toString() ?? '';
          },
          style: { ...ETIQUETA_DATO, color: '#4f46e5' }
        }
      }
    },
    tooltip: {
      formatter: function() {
        return `<b>${this.x}</b>: ${this.y} respuestas`;
      }
    },
    series: [{
      type: 'line',
      name: 'Respuestas',
      color: '#4f46e5',
      data: porDia.map(d => d.total)
    }]
  };
};
