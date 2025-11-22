import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

// **IMPORTS FALTANTES PARA mat-form-field, mat-label, matInput y mat-button**
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { ProjectProgressService } from '../project-progress.service';

@Component({
  selector: 'app-projects-report-view',
  templateUrl: './view-report.component.html',
  styleUrls: ['./view-report.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    // Pipes
    DatePipe,
    CurrencyPipe,

    // Angular Material
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,

    // **NUEVOS IMPORTS**
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class ProjectsReportViewComponent implements OnInit {

  projectName = '';
  location = 'Sin ubicación';
  startDate: any = null;
  dueDate: any = null;
  projectStatus = 'EN PROGRESO';

  overallProgress = 0;

  financials = {
    projectValue: 0,
    pendingPayment: 0,
    totalAnticipo: 0
  };

  projectAreas: any[] = []; // ← aquí se mapearán los avances

  suppliesData = [
    { component: 'Estructura Metálica', value: 12500, progress: 80 },
    { component: 'Paneles', value: 8500, progress: 60 },
    { component: 'Tornillería', value: 1200, progress: 100 },
    { component: 'Pintura', value: 4300, progress: 40 }
  ];

  displayedColumns = ['component', 'value', 'progress'];

  projectLeaders = '';
  operationalLeaders = '';

  anticipoPercent = 0;

  searchProjectId: number | null = null;

  constructor(private projectService: ProjectProgressService) {}

  ngOnInit(): void {
    this.loadProjectData();
  }

  loadProjectData() {
    this.projectService.getProjectById(this.searchProjectId ?? 0).subscribe((data: any) => {

        this.projectName = data.nombre || 'N/A';
        this.location = data.ubicacion || 'Sin ubicación';
        this.startDate = data.fechaInicio ? new Date(data.fechaInicio) : null;
        this.dueDate = data.fechaFin ? new Date(data.fechaFin) : null;
        this.projectStatus = data.estadoProyecto || 'EN PROGRESO';
        this.overallProgress = data.avanceGeneral ?? 0;

        const totalProyecto = data.pagoTotal ?? 0;

        // Convertir anticipos si vienen separados por comas
        let totalAnticipo = 0;

        if (data.anticipoList) {
          totalAnticipo = data.anticipoList
            .split(',')
            .map(x => Number(x.trim()))
            .reduce((a, b) => a + b, 0);
        }

        const pendiente = totalProyecto - totalAnticipo;

        this.financials = {
          projectValue: totalProyecto,
          totalAnticipo: totalAnticipo,
          pendingPayment: pendiente < 0 ? 0 : pendiente
        };

        // % avance gráfico
        this.anticipoPercent = totalProyecto > 0
          ? (totalAnticipo / totalProyecto) * 100
          : 0;

        // 🔥🔥🔥 MAPEAMOS LOS AVANCES AL FRONTEND
        this.projectAreas = Array.isArray(data.avances)
          ? data.avances.map((a: any) => ({
              name: a.descripcion,
              progress: a.valor
            }))
          : [];

    });
  }

  get projectStatusClass(): string {
    return this.projectStatus.toLowerCase().replace(/ /g, '-');
  }

  getProgressClass(progress: number): string {
    if (progress === 100) return 'complete';
    if (progress > 0) return 'in-progress';
    return 'pending';
  }
}
