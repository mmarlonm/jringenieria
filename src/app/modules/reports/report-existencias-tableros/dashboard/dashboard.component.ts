import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

import { ReportExistenciasTablerosService, ExistenciasTablerosDto } from '../report-existencias-tableros.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatSortModule } from '@angular/material/sort';

import { MatDialog } from '@angular/material/dialog';
import { TraspasoModalComponent } from '../../report-product-existence/traspaso-modal/traspaso-modal.component';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReportProductExistenceService } from 'app/modules/reports/report-product-existence/report-product-existence.service';
@Component({
    selector: 'app-reporte-existencias-tableros-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrls: ['../../report-product-existence/dashboard/dashboard.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatTableModule,
        MatSortModule,
        MatCheckboxModule,
        MatTooltipModule
    ]
})

export class ReportExistenciasTablerosDashboardComponent implements OnInit {
    // Datos y Filtros
    @ViewChild(MatSort) sort: MatSort;
    public dataSource = new MatTableDataSource<ExistenciasTablerosDto>([]);

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
        'total',
        'acciones'
    ];

    public selection = new SelectionModel<ExistenciasTablerosDto>(true, []);

    // Variables de filtro
    public esMoral: boolean = false;
    public fechaCorte: Date = new Date();
    public filtroTexto: string = ''; // Para buscar por nombre o código
    public filtroCodes: string = ''; // Para búsqueda masiva por pegado
    totalQRO: number = 0;
    totalPCH: number = 0;
    totalPUE: number = 0;
    totalGeneral: number = 0;

    constructor(
        private reportExistenciasTablerosService: ReportExistenciasTablerosService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        console.log('ReportExistenciasTablerosDashboardComponent: Initializing...');
        this.consultar();
    }

    consultar(): void {
        this.reportExistenciasTablerosService
            .getExistenciasTableros(this.fechaCorte, this.esMoral)
            .subscribe({
                next: (resp) => {
                    console.log('ReportExistenciasTableros: Data received', resp);
                    if (resp && resp.length > 0) {
                        console.log('Sample Object:', resp[0]);
                    } else {
                        console.log('ReportExistenciasTableros: Response is empty');
                    }

                    this.dataSource.data = resp || [];
                    this.dataSource.sort = this.sort;

                    // 🔹 CONFIGURACIÓN DEL FILTRO AVANZADO
                    this.dataSource.filterPredicate = (data: ExistenciasTablerosDto, filter: string) => {
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
                    this.totalQRO = resp.reduce((acc, curr) => acc + (curr.tablerO_QRO || 0), 0);
                    this.totalPCH = resp.reduce((acc, curr) => acc + (curr.tablerO_PACH || 0), 0);
                    this.totalPUE = resp.reduce((acc, curr) => acc + (curr.tablerO_PUE || 0), 0);
                    this.totalGeneral = resp.reduce((acc, curr) => acc + (curr.totaL_TABLEROS || 0), 0);

                    // Aplicar filtro si ya había texto escrito
                    if (this.filtroTexto || this.filtroCodes) {
                        this.aplicarFiltro();
                    }
                },
                error: (err) => {
                    console.error('ReportExistenciasTableros: Error loading data', err);
                }
            });
    }

    /**
     * Filtra los datos localmente por código (rango o lista), nombre, marca o línea.
     */
    aplicarFiltro(): void {
        const filterValue = this.filtroTexto.trim();
        this.dataSource.filter = filterValue || this.filtroCodes;
    }

    /**
     * Maneja el pegado masivo de códigos (Excel, vertical, etc.)
     */
    onPasteCodes(event: ClipboardEvent): void {
        event.preventDefault();
        const data = event.clipboardData?.getData('text') || '';
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
        if (!this.dataSource.data || this.dataSource.data.length === 0) return;

        const headers = [
            'Codigo Producto',
            'Marca',
            'Linea',
            'Producto',
            'QRO',
            'PCH',
            'PUE',
            'Total'
        ];

        const cleanText = (text: any) => {
            if (text === null || text === undefined) return '';
            let str = String(text);
            str = str.replace(/\r?\n|\r/g, " ");
            str = str.replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = this.dataSource.data.map(r => [
            `="${cleanText(r.codigoProducto).replace(/"/g, '')}"`,
            cleanText(r.marca),
            cleanText(r.linea),
            cleanText(r.nombreProducto),
            r.tablerO_QRO,
            r.tablerO_PACH,
            r.tablerO_PUE,
            r.totaL_TABLEROS
        ]);

        const csvContent = '\ufeff' + 'sep=;\n' + [
            headers.join(';'),
            ...rows.map(e => e.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const fileName = `Existencias_Tableros_${Date.now()}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportarPDF(): void {
        const element = document.getElementById('pdf-content');
        if (!element) return;
        window.print();
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

    checkboxLabel(row?: ExistenciasTablerosDto): string {
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
    abrirTraspaso(productos: ExistenciasTablerosDto | ExistenciasTablerosDto[]): void {
        const productList = Array.isArray(productos) ? productos : [productos];

        // Mapear campos de tableros a los esperados por el modal (qro, pach, pue)
        const mappedProducts = productList.map(p => ({
            ...p,
            qro: p.tablerO_QRO,
            pach: p.tablerO_PACH,
            pue: p.tablerO_PUE
        }));

        const dialogRef = this.dialog.open(TraspasoModalComponent, {
            width: '600px',
            data: {
                productos: mappedProducts,
                esMoral: this.esMoral,
                prefix: 'TABLEROS' // Identificador para observaciones
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.selection.clear();
                this.consultar();
            }
        });
    }
}
