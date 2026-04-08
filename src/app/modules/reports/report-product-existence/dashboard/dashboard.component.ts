import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import * as Highcharts from 'highcharts';
import { HighchartsChartModule } from 'highcharts-angular';

import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

import { ReportProductExistenceService } from '../report-product-existence.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { TraspasoModalComponent } from '../traspaso-modal/traspaso-modal.component';
import { MatSort } from '@angular/material/sort';
import { MatSortModule } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
    selector: 'app-reporte-product-existence-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        HighchartsChartModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatTableModule,
        MatSortModule,
        MatCheckboxModule
    ]
})

export class ReportProductExistenceDashboardComponent implements OnInit {
    // Datos y Filtros
    @ViewChild(MatSort) sort: MatSort;
    public dataSource = new MatTableDataSource<any>([]);
    // Cambia esto en tu clase del componente
    public displayedColumns: string[] = [
        'select',
        'buscar',
        'codigo',
        'marca',
        'linea',
        'descripcion',
        'qro',
        'pach',
        'pue',
        'ciat',
        'total',
        'acciones'
    ];

    public selection = new SelectionModel<any>(true, []);


    // Variables de filtro
    public esMoral: boolean = false;
    public fechaCorte: Date = new Date();
    public filtroTexto: string = ''; // Para buscar por nombre o código
    public filtroCodes: string = ''; // Para búsqueda masiva por pegado
    totalQRO: number;
    totalPCH: number;
    totalPUE: number;
    totalCIAT: number;
    totalGeneral: number;

    public productosFiltrados: any[] = [];

    constructor(private reportProductExistenceService: ReportProductExistenceService,
        private dialog: MatDialog) { }

    ngOnInit(): void {
        this.consultar();

    }

    consultar(): void {
        this.reportProductExistenceService
            .getExistenciasPorSucursal(this.fechaCorte, this.esMoral)
            .subscribe(resp => {
                this.dataSource.data = resp;
                this.dataSource.sort = this.sort;

                // 🔹 CONFIGURACIÓN DEL FILTRO AVANZADO
                this.dataSource.filterPredicate = (data: any, filter: string) => {
                    const search = filter.trim().toLowerCase();
                    const codesFilter = this.filtroCodes.trim().toLowerCase();

                    // Campos sobre los que buscamos
                    const codigo = (data.codigoProducto || '').toString().toLowerCase();
                    const nombre = (data.nombreProducto || '').toLowerCase();
                    const marca = (data.marca || '').toLowerCase();
                    const linea = (data.linea || '').toLowerCase();

                    // Si hay filtro de códigos (Pegado masivo)
                    if (codesFilter) {
                        const listCodes = codesFilter.split(',')
                            .map(c => c.trim())
                            .filter(c => c !== '');
                        
                        if (listCodes.length > 0) {
                            // Si el código actual está en la lista del pegado
                            return listCodes.some(c => codigo === c);
                        }
                    }

                    // 1. Caso: Rango numérico (ej: 100-200)
                    if (search.includes('-')) {
                        const partes = search.split('-');
                        const inicio = parseInt(partes[0]);
                        const fin = parseInt(partes[1]);
                        const codigoNum = parseInt(codigo);

                        if (!isNaN(inicio) && !isNaN(fin) && !isNaN(codigoNum)) {
                            return codigoNum >= inicio && codigoNum <= fin;
                        }
                    }

                    // 2. Caso: Lista separada por comas (ej: 1,2,3)
                    if (search.includes(',')) {
                        const codigos = search.split(',')
                            .map(c => c.trim())
                            .filter(c => c !== '');
                        return codigos.some(c => codigo === c);
                    }

                    // 3. Caso: Búsqueda normal (incluye nombre, marca, linea o código)
                    return nombre.includes(search) ||
                        codigo.includes(search) ||
                        marca.includes(search) ||
                        linea.includes(search);
                };

                // Cálculos para KPIs
                this.totalQRO = resp.reduce((acc, curr) => acc + (curr.qro || 0), 0);
                this.totalPCH = resp.reduce((acc, curr) => acc + (curr.pach || 0), 0);
                this.totalPUE = resp.reduce((acc, curr) => acc + (curr.pue || 0), 0);
                this.totalCIAT = resp.reduce((acc, curr) => acc + (curr.ciat || 0), 0);
                this.totalGeneral = resp.reduce((acc, curr) => acc + (curr.total || 0), 0);

                // Aplicar filtro si ya había texto escrito
                if (this.filtroTexto || this.filtroCodes) {
                    this.aplicarFiltro();
                }
            });
    }

    /**
     * Filtra los datos localmente por código (rango o lista), nombre, marca o línea.
     */
    aplicarFiltro(): void {
        // Importante: No pasamos a minúsculas aquí para procesar guiones/comas íntegros
        // el Predicate configurado arriba ya se encarga del case-insensitive
        const filterValue = this.filtroTexto.trim();
        this.dataSource.filter = filterValue || this.filtroCodes;

        // Si usas paginador (aunque no lo veo en tu ViewChild), vuelve a la pag 1
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    /**
     * Maneja el pegado masivo de códigos (Excel, vertical, etc.)
     */
    onPasteCodes(event: ClipboardEvent): void {
        event.preventDefault();
        const data = event.clipboardData?.getData('text') || '';
        // Dividir por cualquier espacio en blanco (incluyendo saltos de línea y tabs) o comas
        const codes = data.split(/[\s,]+/)
            .map(c => c.trim())
            .filter(c => c.length > 0)
            .join(',');
        
        this.filtroCodes = codes;
        this.aplicarFiltro();
    }

    /**
     * Limpia el filtro vertical y recarga la tabla
     */
    limpiarFiltroVertical(): void {
        this.filtroCodes = '';
        this.aplicarFiltro();
    }

    /**
     * Verifica si un código coincide con el filtro masivo para marcarlo visualmente
     */
    isCodeMatched(codigo: any): boolean {
        if (!this.filtroCodes) return false;
        const codes = this.filtroCodes.split(',').map(c => c.trim());
        return codes.includes(String(codigo));
    }

    exportarExcel(): void {
        // Validamos usando dataSource.data que es lo que tiene la tabla actualmente
        if (!this.dataSource.data || this.dataSource.data.length === 0) return;

        const headers = [
            'Codigo Producto',
            'Marca',
            'Linea',
            'Producto',
            'QRO',
            'PCH',
            'PUE',
            'CIAT',
            'Total'
        ];

        // Tu función de limpieza para evitar saltos de columna
        const cleanText = (text: any) => {
            if (text === null || text === undefined) return '';
            let str = String(text);
            str = str.replace(/\r?\n|\r/g, " ");
            str = str.replace(/"/g, '""');
            return `"${str}"`;
        };

        // Mapeamos los datos de la tabla de existencias
        const rows = this.dataSource.data.map(r => [
            `="${cleanText(r.codigoProducto).replace(/"/g, '')}"`,
            cleanText(r.marca),
            cleanText(r.linea),
            cleanText(r.nombreProducto),
            r.qro,
            r.pach,
            r.pue,
            r.ciat,
            r.total
        ]);

        // Construcción del contenido CSV con el separador para Excel
        const csvContent = '\ufeff' + 'sep=;\n' + [
            headers.join(';'),
            ...rows.map(e => e.join(';'))
        ].join('\n');

        // Proceso de descarga
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Nombre del archivo con la fecha actual
        const fileName = `Existencias_Sucursales_${Date.now()}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportarPDF(): void {
        const element = document.getElementById('pdf-content');
        if (!element) return;
        // ... (Tu lógica de html2canvas ya existente)
    }

    /**
     * Lógica de Selección
     */
    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    masterToggle() {
        this.isAllSelected() ?
            this.selection.clear() :
            this.dataSource.data.forEach(row => this.selection.select(row));
    }

    checkboxLabel(row?: any): string {
        if (!row) {
            return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
        }
        return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.codigoProducto}`;
    }

    abrirTraspasoMasivo(): void {
        const seleccionados = this.selection.selected;
        if (seleccionados.length === 0) return;
        this.abrirTraspaso(seleccionados);
    }

    /**
   * Abre el modal para iniciar un traspaso del producto o productos seleccionados
   */
    abrirTraspaso(productos: any | any[]): void {
        const productList = Array.isArray(productos) ? productos : [productos];

        // Mapear productos para asegurar que tengan ciat si viene de ExistenciaSucursalDto
        const mappedProducts = productList.map(p => ({
            ...p,
            ciat: p.ciat || 0
        }));

        const dialogRef = this.dialog.open(TraspasoModalComponent, {
            width: '600px', // Aumentado para manejar lista
            data: {
                productos: mappedProducts,
                esMoral: this.esMoral
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.selection.clear();
                this.consultar(); // Recargar si el traspaso fue exitoso
            }
        });
    }
}
