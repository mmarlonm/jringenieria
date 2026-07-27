import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventosService, Asistente, EventoEdicion } from '../eventos.service';

interface ReporteEmpresa {
  empresa: string;
  cantidad: number;
  porcentaje: number;
  tipos: { tipo: string; count: number }[];
}

interface ReporteEstadistica {
  label: string;
  value: number | string;
  icon?: string;
  color?: string;
}

@Component({
  selector: 'app-eventos-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatCardModule,
    MatFormFieldModule,
    NgApexchartsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventosReportesComponent implements OnInit, OnDestroy {
  private _eventosService = inject(EventosService);
  private _cdr = inject(ChangeDetectorRef);

  public ediciones: EventoEdicion[] = [];
  public selectedEventoId: number = 2026;
  public asistentes: Asistente[] = [];
  public isLoading: boolean = true;

  public reporteEmpresas: ReporteEmpresa[] = [];
  public reporteUniversidades: ReporteEmpresa[] = [];
  public reportePorTipo: { tipo: string; cantidad: number; porcentaje: number }[] = [];
  public estadisticasGenerales: ReporteEstadistica[] = [];

  public displayedColumnsEmpresas: string[] = ['empresa', 'cantidad', 'porcentaje', 'tipos'];
  public displayedColumnsUniversidades: string[] = ['universidad', 'cantidad', 'porcentaje', 'carrera'];

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this._eventosService.ediciones$
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.ediciones = list || [];
        this._cdr.markForCheck();
      });

    this._eventosService.selectedEventoId$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        this.selectedEventoId = id;
        this.loadReports();
        this._cdr.markForCheck();
      });
  }

  loadReports(): void {
    this.isLoading = true;
    this._eventosService.getAsistentes(this.selectedEventoId).subscribe({
      next: (asistentes) => {
        this.asistentes = asistentes || [];
        this.generarReportes();
        this.isLoading = false;
        this._cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading asistentes:', err);
        this.isLoading = false;
        this._cdr.markForCheck();
      }
    });
  }

  onEventoChanged(eventoId: number): void {
    this._eventosService.selectEventoId(eventoId);
  }

  private generarReportes(): void {
    this.generarReporteEmpresas();
    this.generarReporteUniversidades();
    this.generarReportePorTipo();
    this.generarEstadisticasGenerales();
  }

  private generarReporteEmpresas(): void {
    const empresasMap = new Map<string, { count: number; tipos: Map<string, number> }>();

    this.asistentes
      .filter(a => a.empresa && a.empresa.trim() !== '' && a.empresa !== 'S/D')
      .forEach(a => {
        const empresa = a.empresa.trim();
        if (!empresasMap.has(empresa)) {
          empresasMap.set(empresa, { count: 0, tipos: new Map() });
        }
        const data = empresasMap.get(empresa)!;
        data.count++;
        const tipoCount = data.tipos.get(a.tipo) || 0;
        data.tipos.set(a.tipo, tipoCount + 1);
      });

    const total = Array.from(empresasMap.values()).reduce((sum, d) => sum + d.count, 0);

    this.reporteEmpresas = Array.from(empresasMap.entries())
      .map(([empresa, data]) => ({
        empresa,
        cantidad: data.count,
        porcentaje: Math.round((data.count / total) * 100 * 100) / 100,
        tipos: Array.from(data.tipos.entries()).map(([tipo, count]) => ({ tipo, count }))
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private generarReporteUniversidades(): void {
    const univMap = new Map<string, { count: number; carreras: Map<string, number> }>();

    this.asistentes
      .filter(a => a.universidad && a.universidad.trim() !== '')
      .forEach(a => {
        const univ = a.universidad.trim();
        if (!univMap.has(univ)) {
          univMap.set(univ, { count: 0, carreras: new Map() });
        }
        const data = univMap.get(univ)!;
        data.count++;
        if (a.carrera) {
          const carreraCount = data.carreras.get(a.carrera) || 0;
          data.carreras.set(a.carrera, carreraCount + 1);
        }
      });

    const total = Array.from(univMap.values()).reduce((sum, d) => sum + d.count, 0);

    this.reporteUniversidades = Array.from(univMap.entries())
      .map(([universidad, data]) => ({
        empresa: universidad,
        cantidad: data.count,
        porcentaje: Math.round((data.count / total) * 100 * 100) / 100,
        tipos: Array.from(data.carreras.entries()).map(([carrera, count]) => ({ tipo: carrera, count }))
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private generarReportePorTipo(): void {
    const tiposMap = new Map<string, number>();

    this.asistentes.forEach(a => {
      const tipo = a.tipo || 'Sin especificar';
      tiposMap.set(tipo, (tiposMap.get(tipo) || 0) + 1);
    });

    const total = this.asistentes.length;

    this.reportePorTipo = Array.from(tiposMap.entries())
      .map(([tipo, cantidad]) => ({
        tipo,
        cantidad,
        porcentaje: Math.round((cantidad / total) * 100 * 100) / 100
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private generarEstadisticasGenerales(): void {
    const totalAsistentes = this.asistentes.length;
    const asistieron = this.asistentes.filter(a => a.asistencia === 'Presente').length;
    const empresasUnicas = new Set(this.asistentes.filter(a => a.empresa && a.empresa.trim() !== 'S/D').map(a => a.empresa)).size;
    const universidadesUnicas = new Set(this.asistentes.filter(a => a.universidad).map(a => a.universidad)).size;

    this.estadisticasGenerales = [
      { label: 'Total Registrados', value: totalAsistentes, icon: 'heroicons_outline:users', color: 'emerald' },
      { label: 'Asistieron', value: asistieron, icon: 'heroicons_outline:check-circle', color: 'green' },
      {
        label: 'Tasa Asistencia',
        value: totalAsistentes > 0 ? Math.round((asistieron / totalAsistentes) * 100) + '%' : '0%',
        icon: 'heroicons_outline:chart-pie',
        color: 'indigo'
      },
      { label: 'Empresas', value: empresasUnicas, icon: 'heroicons_outline:building-office', color: 'blue' },
      { label: 'Universidades', value: universidadesUnicas, icon: 'heroicons_outline:academic-cap', color: 'purple' }
    ];
  }

  getPromedioEdad(): string {
    // Placeholder: calcular edad desde fechaRegistro o campo específico si existe
    return 'N/D';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
