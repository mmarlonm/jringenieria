import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import { PreguntaReporte, RespuestaAbierta, FilaMatrizReporte } from './reporte-respuestas.types';
import { opcionesBarras, opcionesNiveles, opcionesPromedios, opcionesRangos } from './reporte-respuestas.charts';

@Component({
  selector: 'eventos-pregunta-reporte',
  templateUrl: './pregunta-reporte.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartModule,
    MatIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreguntaReporteComponent implements OnChanges {
  @Input({ required: true }) pregunta!: PreguntaReporte;

  public Highcharts: typeof Highcharts = Highcharts;

  public opcionesPrincipal: Highcharts.Options | null = null;
  public opcionesPromedios: Highcharts.Options | null = null;
  public altoPrincipal: number = 300;
  public altoPromedios: number = 200;
  public busqueda: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pregunta']) {
      this.busqueda = '';
      this.armarGraficas();
    }
  }

  private armarGraficas(): void {
    this.opcionesPrincipal = null;
    this.opcionesPromedios = null;

    if (this.pregunta.base === 0) return;

    switch (this.pregunta.tipo) {
      case 'opcion':
      case 'multiple':
        this.opcionesPrincipal = opcionesBarras(this.pregunta);
        this.altoPrincipal = Math.max(180, 36 * (this.pregunta.opciones?.length ?? 0) + 80);
        break;

      case 'matriz':
        this.opcionesPrincipal = opcionesNiveles(this.pregunta);
        this.altoPrincipal = Math.max(220, 48 * (this.pregunta.matriz?.filas.length ?? 0) + 110);
        this.opcionesPromedios = opcionesPromedios(this.pregunta);
        this.altoPromedios = Math.max(180, 36 * (this.pregunta.matriz?.filas.filter(f => f.promedio !== null).length ?? 0) + 80);
        break;

      case 'numero':
        this.opcionesPrincipal = opcionesRangos(this.pregunta);
        this.altoPrincipal = 280;
        break;
    }
  }

  /** La lista ya viene recortada a las 20 más recientes; la búsqueda ignora mayúsculas y acentos. */
  public abiertasFiltradas(): RespuestaAbierta[] {
    const abiertas = this.pregunta.abiertas ?? [];
    const consulta = this.normalizar(this.busqueda.trim());
    return consulta ? abiertas.filter(a => this.normalizar(a.texto).includes(consulta)) : abiertas;
  }

  public get filasConTopDos(): FilaMatrizReporte[] {
    return this.pregunta.matriz?.filas.filter(f => f.topDos !== null) ?? [];
  }

  public trackByIndex(index: number): number {
    return index;
  }

  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
}
