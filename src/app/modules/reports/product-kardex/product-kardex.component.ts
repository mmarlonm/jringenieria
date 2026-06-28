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
import { CommonExcelExportService } from 'app/shared/utils/common-excel-export.service';

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
        private _changeDetectorRef: ChangeDetectorRef,
        private _excelService: CommonExcelExportService
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

        const rows = this.data.map(item => [
            item.codigo || '',
            item.producto || '',
            item.fecha ? new Date(item.fecha) : '',
            item.concepto || '',
            item.folio || '',
            item.tipo_Mov || '',
            item.cantidad || 0,
            item.precio || 0,
            item.subtotal || 0,
            item.almacen_Sucursal || '',
            item.referencia_Documento || '',
            item.id_Usuario || '',
            item.observaciones_Movimiento || ''
        ]);

        try {
            const codeVal = this.filterForm.get('codigo').value || 'Todos';
            this._excelService.exportTableToExcel(`Kardex_${codeVal}`, headers, rows);
        } catch (err) {
            console.error('Error al exportar a Excel:', err);
        }
    }
}
