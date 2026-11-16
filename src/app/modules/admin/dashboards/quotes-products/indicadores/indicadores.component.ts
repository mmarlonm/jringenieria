import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { QuotesService } from '../quotes-products.service';
import { ProjectService } from '../../project/project.service';
import {
  FiltroIndicadoresSgc,
  IndicadoresSgc,
  MotivoPerdidaDto,
} from '../quotes-products.types';

const NOMBRES_MOTIVOS: Record<string, string> = {
  Precio: 'Precio',
  Tiempo: 'Tiempo de entrega',
  Competencia: 'Competencia',
  DecisionCliente: 'Decisión del cliente',
  FaltaPresupuesto: 'Falta de presupuesto',
  CancelacionProyecto: 'Cancelación del proyecto',
  NoRespuesta: 'No respuesta',
  CambioPrioridad: 'Cambio de prioridad del cliente',
  Vencida: 'Vencida',
  SinMotivo: 'Sin motivo especificado',
  Otro: 'Otro',
};

@Component({
  selector: 'app-indicadores',
  templateUrl: './indicadores.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
  ],
})
export class IndicadoresComponent implements OnInit {
  // Rango de fechas por defecto: primer día del mes actual a hoy
  // Valores guardados en propiedades, NUNCA getters que creen fechas
  desde: string = '';
  hasta: string = '';
  tipo: string = '';
  unidadDeNegocioId: number | null = null;

  unidadesDeNegocio: any[] = [];
  indicadores: IndicadoresSgc | null = null;
  cargando: boolean = false;
  errorMensaje: string | null = null;
  errorRed: boolean = false;

  tiposDisponibles = [
    { codigo: '', nombre: 'Todos los tipos' },
    { codigo: 'CS', nombre: 'Comercial simple (CS)' },
    { codigo: 'CT', nombre: 'Comercial técnica (CT)' },
    { codigo: 'CE', nombre: 'Comercial especial (CE)' },
  ];

  constructor(
    private quotesService: QuotesService,
    private projectService: ProjectService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');

    this.desde = `${y}-${m}-01`;
    this.hasta = `${y}-${m}-${d}`;
  }

  ngOnInit(): void {
    this.cargarUnidadesDeNegocio();
    this.consultar();
  }

  cargarUnidadesDeNegocio(): void {
    if (typeof this.projectService?.getUnidadesDeNegocio === 'function') {
      this.projectService.getUnidadesDeNegocio().subscribe({
        next: (res: any) => {
          if (res && res.code === 200 && Array.isArray(res.data)) {
            this.unidadesDeNegocio = res.data;
          } else if (Array.isArray(res)) {
            this.unidadesDeNegocio = res;
          }
        },
        error: () => {},
      });
    }
  }

  consultar(): void {
    if (!this.desde || !this.hasta) {
      return;
    }

    this.cargando = true;
    this.errorMensaje = null;
    this.errorRed = false;

    const filtro: FiltroIndicadoresSgc = {
      desde: this.desde,
      hasta: this.hasta,
      tipo: this.tipo || null,
      unidadDeNegocioId:
        this.unidadDeNegocioId !== null && this.unidadDeNegocioId !== undefined && this.unidadDeNegocioId !== 0
          ? Number(this.unidadDeNegocioId)
          : null,
    };

    this.quotesService.indicadores(filtro).subscribe({
      next: (res) => {
        this.indicadores = res;
        this.cargando = false;
        this.errorMensaje = null;
        this.errorRed = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargando = false;
        if (err?.status === 400 && err?.error?.mensaje) {
          this.errorMensaje = err.error.mensaje;
          this.errorRed = false;
        } else {
          this.errorRed = true;
          this.errorMensaje =
            err?.error?.mensaje ||
            'Error al cargar indicadores. Verifique la conexión a la red.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  totalCerradasNoGanadas(): number {
    if (!this.indicadores) return 0;
    return (
      (this.indicadores.perdidas || 0) +
      (this.indicadores.canceladas || 0) +
      (this.indicadores.vencidas || 0) +
      (this.indicadores.cerradasSinRespuesta || 0)
    );
  }

  nombreMotivo(codigo: string): string {
    return NOMBRES_MOTIVOS[codigo] || codigo;
  }

  maximoMotivos(): number {
    if (!this.indicadores?.motivosPerdida || this.indicadores.motivosPerdida.length === 0) {
      return 1;
    }
    const max = Math.max(...this.indicadores.motivosPerdida.map((m) => m.cantidad));
    return max > 0 ? max : 1;
  }

  porcentajeBarraMotivo(cantidad: number): number {
    const max = this.maximoMotivos();
    return Math.round((cantidad / max) * 100);
  }

  formatearNumero(val?: number | null, sufijo: string = ''): string {
    if (val === null || val === undefined) {
      return '—';
    }
    return `${val}${sufijo}`;
  }
}
