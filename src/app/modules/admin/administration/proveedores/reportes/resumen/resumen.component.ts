import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ProveedoresService } from '../../proveedores.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-resumen',
    templateUrl: './resumen.component.html',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatDividerModule,
        MatProgressBarModule,
        MatTooltipModule,
        RouterModule
    ]
})
export class ResumenComponent implements OnInit {
    isLoading: boolean = false;
    reportData = {
        totalProveedores: 0,
        proveedoresActivos: 0,
        proveedoresCondicionados: 0,
        proveedoresSuspendidos: 0,
        evaluacionesRegistradas: 0,
        promedioCalificacion: 0
    };
    historico: any[] = [];

    // Lista estática de rangos de clasificación basados en la especificación
    clasificaciones = [
        {
            rango: '90-100',
            nombre: 'A - Recomendado',
            interpretacion: 'Proveedor confiable.',
            accion: 'Mantener y considerar como preferente.',
            responsable: 'Compras / área solicitante',
            colorBg: 'bg-emerald-50/50',
            colorText: 'text-emerald-700',
            badgeBg: 'bg-emerald-500 text-white'
        },
        {
            rango: '80-89',
            nombre: 'B - Aprobado con seguimiento',
            interpretacion: 'mejora.',
            accion: 'Solicitar mejora y monitorear.',
            responsable: 'Compras',
            colorBg: 'bg-blue-50/50',
            colorText: 'text-blue-700',
            badgeBg: 'bg-blue-500 text-white'
        },
        {
            rango: '70-79',
            nombre: 'C - Condicionado',
            interpretacion: 'Riesgo operativo o administrativo.',
            accion: 'Definir plan de acción obligatorio.',
            responsable: 'Compras / Dirección',
            colorBg: 'bg-amber-50/50',
            colorText: 'text-amber-700',
            badgeBg: 'bg-amber-500 text-white'
        },
        {
            rango: '0-69',
            nombre: 'D - No recomendado',
            interpretacion: 'Proveedor no apto o de alto riesgo.',
            accion: 'Suspender o requerir autorización especial.',
            responsable: 'Dirección',
            colorBg: 'bg-rose-50/50',
            colorText: 'text-rose-700',
            badgeBg: 'bg-rose-500 text-white'
        }
    ];

    constructor(private _proveedoresService: ProveedoresService) {}

    ngOnInit(): void {
        this.cargarReporte();
    }

    cargarReporte(): void {
        this.isLoading = true;
        this._proveedoresService.getReporteResumen().subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    this.reportData = {
                        totalProveedores: res.data.totalProveedores,
                        proveedoresActivos: res.data.proveedoresActivos,
                        proveedoresCondicionados: res.data.proveedoresCondicionados,
                        proveedoresSuspendidos: res.data.proveedoresSuspendidos,
                        evaluacionesRegistradas: res.data.evaluacionesRegistradas,
                        promedioCalificacion: res.data.promedioCalificacion
                    };
                    this.historico = res.data.historicoAutorizaciones || [];
                }
                this.isLoading = false;
            },
            error: (err) => {
                this.isLoading = false;
                Swal.fire('Error', 'No se pudo cargar la información del reporte.', 'error');
            }
        });
    }
}
