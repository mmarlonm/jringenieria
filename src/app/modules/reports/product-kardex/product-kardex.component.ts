import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatNativeDateModule } from '@angular/material/core';
import { ProductKardexService, KardexProducto } from './product-kardex.service';
import { DateTime } from 'luxon';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'product-kardex',
    templateUrl: './product-kardex.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatNativeDateModule,
    ],
})
export class ProductKardexComponent implements OnInit {
    filterForm: FormGroup;
    data: KardexProducto[] = [];
    isLoading: boolean = false;
    hasSearched: boolean = false;
    errorMessage: string | null = null;

    branches = [
        { value: 'TODAS', label: 'TODAS' },
        { value: 'Pachuca', label: 'Pachuca' },
        { value: 'Puebla', label: 'Puebla' },
        { value: 'Querétaro', label: 'Querétaro' },
    ];

    companies = [
        { value: 0, label: 'Ambas' },
        { value: 1, label: 'Física' },
        { value: 2, label: 'Moral' },
    ];

    constructor(
        private _formBuilder: FormBuilder,
        private _productKardexService: ProductKardexService,
        private _changeDetectorRef: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        const now = DateTime.now();
        const startOfMonth = now.startOf('month');

        this.filterForm = this._formBuilder.group({
            codigo: [''],
            fechaInicio: [startOfMonth.toJSDate(), Validators.required],
            fechaFin: [now.toJSDate(), Validators.required],
            sucursal: ['TODAS'],
            tipoEmpresa: [0],
        });
    }

    consultar(): void {
        if (this.filterForm.invalid) {
            this.filterForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;
        this.hasSearched = true;
        this.data = [];

        const filters = this.filterForm.getRawValue();
        
        const start = DateTime.isDateTime(filters.fechaInicio) 
            ? filters.fechaInicio 
            : DateTime.fromJSDate(filters.fechaInicio);
            
        const end = DateTime.isDateTime(filters.fechaFin) 
            ? filters.fechaFin 
            : DateTime.fromJSDate(filters.fechaFin);

        const startDate = start.toFormat('yyyy-MM-dd');
        const endDate = end.toFormat('yyyy-MM-dd');

        this._productKardexService
            .getKardex(
                filters.codigo,
                startDate,
                endDate,
                filters.sucursal,
                filters.tipoEmpresa
            )
            .pipe(
                finalize(() => {
                    this.isLoading = false;
                    this._changeDetectorRef.markForCheck();
                })
            )
            .subscribe({
                next: (res) => {
                    this.data = res || [];
                    this.errorMessage = null;
                    this._changeDetectorRef.markForCheck();
                },
                error: (err) => {
                    console.error('Error fetching kardex:', err);
                    this.data = [];
                    this.errorMessage = 'Ocurrió un error al obtener los movimientos. Por favor, intente de nuevo.';
                    this._changeDetectorRef.markForCheck();
                },
            });
    }

    exportToExcel(): void {
        if (!this.data || this.data.length === 0) {
            return;
        }

        const headers = [
            'Codigo',
            'Producto',
            'Fecha',
            'Concepto',
            'Folio',
            'Tipo',
            'Cantidad',
            'Precio',
            'Subtotal',
            'Almacen',
            'Referencia',
            'Usuario',
            'Observaciones'
        ];

        const cleanText = (text: any) => {
            if (text === null || text === undefined) {
                return '';
            }
            let str = String(text);
            str = str.replace(/\r?\n|\r/g, " ").replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = this.data.map(item => [
            cleanText(item.codigo),
            cleanText(item.producto),
            cleanText(DateTime.fromISO(item.fecha as any).toFormat('dd/MM/yyyy')),
            cleanText(item.concepto),
            cleanText(item.folio),
            cleanText(item.tipo_Mov),
            item.cantidad,
            item.precio,
            item.subtotal,
            cleanText(item.almacen_Sucursal),
            cleanText(item.referencia_Documento),
            cleanText(item.id_Usuario),
            cleanText(item.observaciones_Movimiento)
        ]);

        // Usamos \r\n para compatibilidad total con Excel en Windows
        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\r\n');

        // El BOM (\ufeff) debe ir al puro inicio para que Excel detecte UTF-8
        const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const fileName = `Kardex_${this.filterForm.get('codigo').value || 'Todos'}_${DateTime.now().toFormat('yyyyMMdd_HHmm')}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
