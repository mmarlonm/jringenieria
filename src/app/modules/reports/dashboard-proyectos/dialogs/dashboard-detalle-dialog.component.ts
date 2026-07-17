import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { HighchartsChartModule } from 'highcharts-angular';
import * as Highcharts from 'highcharts';

@Component({
    selector: 'app-dashboard-detalle-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        HighchartsChartModule
    ],
    templateUrl: './dashboard-detalle-dialog.component.html'
})
export class DashboardDetalleDialogComponent implements OnInit {
    Highcharts: typeof Highcharts = Highcharts;
    chartOptions: Highcharts.Options = {};
    displayedColumns: string[] = ['tarea', 'proyecto', 'prioridad', 'responsable', 'estado', 'fechaLimite'];
    
    // KPIs calculados
    totalTareas: number = 0;
    completadas: number = 0;
    enProceso: number = 0;
    pendientes: number = 0;
    porcentajeCompletado: number = 0;

    constructor(
        public dialogRef: MatDialogRef<DashboardDetalleDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { titulo: string; tareas: any[] }
    ) {}

    ngOnInit(): void {
        this.calcularKpis();
        this.buildChart();
    }

    calcularKpis(): void {
        const t = this.data.tareas || [];
        this.totalTareas = t.length;
        this.completadas = t.filter(x => x.estado?.toLowerCase() === 'completado').length;
        this.enProceso = t.filter(x => x.estado?.toLowerCase() === 'en proceso').length;
        this.pendientes = t.filter(x => x.estado?.toLowerCase() === 'pendiente').length;
        
        this.porcentajeCompletado = this.totalTareas > 0 
            ? Math.round((this.completadas / this.totalTareas) * 100)
            : 0;
    }

    buildChart(): void {
        this.chartOptions = {
            chart: {
                type: 'pie',
                height: 220,
                backgroundColor: 'transparent'
            },
            title: { text: '' },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.y} ({point.percentage:.1f}%)</b>'
            },
            accessibility: {
                point: { valueSuffix: '%' }
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: false
                    },
                    showInLegend: true
                }
            },
            legend: {
                align: 'right',
                verticalAlign: 'middle',
                layout: 'vertical'
            },
            credits: { enabled: false },
            series: [{
                name: 'Tareas',
                type: 'pie',
                data: [
                    { name: 'Completado', y: this.completadas, color: '#10b981' },
                    { name: 'En Proceso', y: this.enProceso, color: '#3b82f6' },
                    { name: 'Pendiente', y: this.pendientes, color: '#f59e0b' }
                ]
            }] as any
        };
    }

    getPrioridadBadge(prioridad: string): string {
        const p = prioridad?.toLowerCase() || '';
        if (p.includes('alta') || p.includes('urgente')) return 'bg-red-100 text-red-800';
        if (p.includes('baja')) return 'bg-slate-100 text-slate-800';
        return 'bg-blue-100 text-blue-800';
    }

    close(): void {
        this.dialogRef.close();
    }
}
