import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PersonalManagementService, AsistenciaReporteDto } from '../../../personal-management/personal-management.service';

@Component({
    selector: 'app-report-entrada-salida-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatTableModule,
        MatSortModule,
        MatProgressSpinnerModule
    ]
})
export class ReportEntradaSalidaDashboardComponent implements OnInit {

    @ViewChild(MatSort) sort: MatSort;
    public dataSource = new MatTableDataSource<AsistenciaReporteDto>([]);
    public displayedColumns: string[] = [
        'fecha',
        'nombreUsuario',
        'horaEntrada',
        'ubicacionEntrada',
        'horaSalida',
        'ubicacionSalida',
        'esRetardo',
        'minutosExtra',
        'observaciones'
    ];

    public loading: boolean = false;
    public fechaInicio: Date = new Date();
    public fechaFin: Date = new Date();
    public filtroTexto: string = '';

    // KPIs
    public totalRegistros: number = 0;
    public totalRetardos: number = 0;
    public totalMinutosExtra: number = 0;

    constructor(private _rrhhService: PersonalManagementService) {
        // Inicializar con el mes actual
        const date = new Date();
        this.fechaInicio = new Date(date.getFullYear(), date.getMonth(), 1);
        this.fechaFin = new Date();
    }

    ngOnInit(): void {
        this.consultar();
    }

    consultar(): void {
        this.loading = true;

        const fInicio = this.fechaInicio.toISOString().split('T')[0];
        const fFin = this.fechaFin.toISOString().split('T')[0];

        this._rrhhService.getReporteAsistencias(fInicio, fFin).subscribe({
            next: (resp) => {
                this.dataSource.data = resp;
                this.dataSource.sort = this.sort;
                this.calcularKPIs(resp);
                this.loading = false;
            },
            error: (err) => {
                console.error('Error al cargar reporte:', err);
                this.loading = false;
            }
        });
    }

    aplicarFiltro(): void {
        this.dataSource.filter = this.filtroTexto.trim().toLowerCase();
    }

    calcularKPIs(data: AsistenciaReporteDto[]): void {
        this.totalRegistros = data.length;
        this.totalRetardos = data.filter(a => a.esRetardo).length;
        this.totalMinutosExtra = data.reduce((acc, curr) => acc + (curr.minutosExtra || 0), 0);
    }
}
