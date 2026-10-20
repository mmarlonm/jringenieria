import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';
import Exporting from 'highcharts/modules/exporting';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ReporteRespuestasService } from './reporte-respuestas.service';
import { ReporteFormulario } from './reporte-respuestas.types';
import { opcionesPorDia } from './reporte-respuestas.charts';
import { FormularioRegistroService, FormularioRegistroAdminDto } from '../configurador-registro/formulario-registro.service';
import { PreguntaReporteComponent } from './pregunta-reporte.component';

Exporting(Highcharts);

export interface GrupoFormularios {
  evento: string;
  formularios: FormularioRegistroAdminDto[];
}

@Component({
  selector: 'eventos-reporte-respuestas',
  templateUrl: './reporte-respuestas.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HighchartsChartModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PreguntaReporteComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteRespuestasComponent implements OnInit, OnDestroy {
  public Highcharts: typeof Highcharts = Highcharts;

  private _reporteService = inject(ReporteRespuestasService);
  private _formularioService = inject(FormularioRegistroService);
  private _cdr = inject(ChangeDetectorRef);

  public formularios: FormularioRegistroAdminDto[] = [];
  public formulariosPorEvento: GrupoFormularios[] = [];
  public formularioId: number | null = null;
  public desde: string = '';
  public hasta: string = '';

  public reporte: ReporteFormulario | null = null;
  public cargando: boolean = false;
  public cargandoFormularios: boolean = false;
  public error: string | null = null;
  public errorFormularios: string | null = null;
  public exportando: boolean = false;
  public opcionesPorDia: Highcharts.Options | null = null;

  private _destroy$ = new Subject<void>();
  private _solicitudReporte$ = new Subject<{ formularioId: number; desde?: string | null; hasta?: string | null }>();

  ngOnInit(): void {
    this._solicitudReporte$
      .pipe(
        switchMap(peticion => {
          this.cargando = true;
          this.error = null;
          this._cdr.markForCheck();
          return this._reporteService.getReporte(peticion.formularioId, peticion.desde, peticion.hasta);
        }),
        takeUntil(this._destroy$)
      )
      .subscribe({
        next: (rep) => {
          this.reporte = rep;
          this.cargando = false;
          this.error = null;
          if (rep.resumen && rep.resumen.porDia && rep.resumen.porDia.length > 0) {
            this.opcionesPorDia = opcionesPorDia(rep.resumen);
          } else {
            this.opcionesPorDia = null;
          }
          this._cdr.markForCheck();
        },
        error: (err) => {
          this.cargando = false;
          this.reporte = null;
          this.opcionesPorDia = null;
          this.error = err?.error?.mensaje || 'No se pudo generar el reporte.';
          this._cdr.markForCheck();
        }
      });

    this.cargarFormularios();
  }

  public cargarFormularios(): void {
    this.cargandoFormularios = true;
    this.errorFormularios = null;
    this._cdr.markForCheck();

    this._formularioService.getTodos()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (items) => {
          this.formularios = items || [];
          this.cargandoFormularios = false;
          this.agruparFormularios(this.formularios);
          this._cdr.markForCheck();
        },
        error: (err) => {
          this.cargandoFormularios = false;
          this.errorFormularios = err?.error?.mensaje || 'No se pudieron cargar los formularios disponibles.';
          this._cdr.markForCheck();
        }
      });
  }

  private agruparFormularios(items: FormularioRegistroAdminDto[]): void {
    const mapa = new Map<string, FormularioRegistroAdminDto[]>();

    for (const f of items) {
      const evento = (f.nombreEvento && f.nombreEvento.trim()) ? f.nombreEvento.trim() : 'Sin evento';
      const grupo = mapa.get(evento);
      if (grupo) {
        grupo.push(f);
      } else {
        mapa.set(evento, [f]);
      }
    }

    const grupos: GrupoFormularios[] = [];
    const llavesOrdenadas = Array.from(mapa.keys()).sort((a, b) => a.localeCompare(b, 'es-MX'));

    for (const k of llavesOrdenadas) {
      const lista = mapa.get(k) || [];
      lista.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'es-MX'));
      grupos.push({ evento: k, formularios: lista });
    }

    this.formulariosPorEvento = grupos;
  }

  public cargarReporte(): void {
    if (!this.formularioId) {
      return;
    }

    const desdeLimpio = this.desde ? this.desde.trim() : '';
    const hastaLimpio = this.hasta ? this.hasta.trim() : '';

    if (desdeLimpio && hastaLimpio && desdeLimpio > hastaLimpio) {
      this.error = 'La fecha inicial no puede ser posterior a la final.';
      this.cargando = false;
      this._cdr.markForCheck();
      return;
    }

    this.error = null;
    this._solicitudReporte$.next({
      formularioId: this.formularioId,
      desde: desdeLimpio || null,
      hasta: hastaLimpio || null
    });
  }

  public limpiarFechas(): void {
    this.desde = '';
    this.hasta = '';
    this.cargarReporte();
  }

  public reintentar(): void {
    if (this.formularioId) {
      this.cargarReporte();
    } else {
      this.cargarFormularios();
    }
  }

  get hayFiltroDeFechas(): boolean {
    return Boolean((this.desde && this.desde.trim()) || (this.hasta && this.hasta.trim()));
  }

  get totalPreguntas(): number {
    if (!this.reporte || !this.reporte.secciones) {
      return 0;
    }
    return this.reporte.secciones.reduce((acc, sec) => acc + (sec.preguntas ? sec.preguntas.length : 0), 0);
  }

  get tasaTexto(): string {
    const v = this.reporte?.resumen?.tasaRespuesta;
    if (v === null || v === undefined) {
      return '—';
    }
    return `${v.toFixed(1)}%`;
  }

  get completitudTexto(): string {
    const v = this.reporte?.resumen?.completitudPromedio;
    if (v === null || v === undefined) {
      return '—';
    }
    return `${v.toFixed(1)}%`;
  }

  get ultimaRespuestaTexto(): string {
    const f = this.reporte?.resumen?.ultimaRespuesta;
    if (!f) {
      return '—';
    }
    // viene en hora de México sin zona: se lee y se muestra tal cual
    const d = new Date(f);
    return isNaN(d.getTime()) ? f : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private slugificar(texto: string): string {
    return (texto || 'formulario')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  public async exportarPDF(): Promise<void> {
    if (!this.reporte || this.cargando || this.exportando) {
      return;
    }

    const elemento = document.getElementById('pdf-content');
    if (!elemento) {
      this.error = 'No se encontró el contenedor a exportar.';
      this._cdr.markForCheck();
      return;
    }

    this.exportando = true;
    this._cdr.markForCheck();

    try {
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        scrollY: -window.scrollY
      });

      const pdf = new jsPDF('p', 'pt', 'a4');
      const anchoPagina = pdf.internal.pageSize.getWidth();
      const altoPagina = pdf.internal.pageSize.getHeight();

      const imgWidth = anchoPagina;
      const imgHeight = (canvas.height * anchoPagina) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let alturaRestante = imgHeight;
      let posicionY = 0;

      pdf.addImage(imgData, 'PNG', 0, posicionY, imgWidth, imgHeight);
      alturaRestante -= altoPagina;

      while (alturaRestante > 0) {
        posicionY -= altoPagina;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, posicionY, imgWidth, imgHeight);
        alturaRestante -= altoPagina;
      }

      const slug = this.slugificar(this.reporte.titulo);
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      const nombreArchivo = `respuestas-${slug}-${yyyy}-${mm}-${dd}.pdf`;

      pdf.save(nombreArchivo);
    } catch (err: any) {
      console.error('Error al exportar PDF:', err);
      this.error = 'Ocurrió un error al generar el PDF del reporte.';
    } finally {
      this.exportando = false;
      this._cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
