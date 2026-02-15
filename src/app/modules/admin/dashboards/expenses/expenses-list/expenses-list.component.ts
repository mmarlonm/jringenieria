import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil, map, startWith, forkJoin } from 'rxjs';
import { ExpensesService } from '../expenses.service';
import { Expense, ExpenseCatalogs } from '../models/expenses.types';
import Swal from 'sweetalert2';
import moment from 'moment';

@Component({
    selector: 'expenses-list',
    templateUrl: './expenses-list.component.html',
    styleUrls: ['./expenses-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatDialogModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatInputModule,
        MatMenuModule,
        MatSelectModule,
        MatDatepickerModule,
        MatMomentDateModule,
        MatSidenavModule,
        MatDividerModule,
        CurrencyPipe,
        DatePipe
    ],
})
export class ExpensesListComponent implements OnInit, OnDestroy {

    @ViewChild('matDrawer') matDrawer: MatDrawer;

    dataSource: MatTableDataSource<Expense> = new MatTableDataSource();
    displayedColumns: string[] = [
        'fecha', 'gasto', 'tipo', 'concepto', 'subtipo', 'unidad', 'area', 'cantidad',
        'proveedor', 'factura', 'tasa', 'formaPago', 'cuenta', 'descripcion',
        'impuestos', 'mes', 'año', 'registro', 'acciones'
    ];
    searchInputControl: FormControl = new FormControl('');

    // Edición Inline
    editingId: number | null = null;
    isAdding: boolean = false;
    rowForm: FormGroup;
    catalogs: ExpenseCatalogs;
    selectedExpense: Expense | null = null;
    unidadesNegocio: any[] = [];
    currentUserUnidadId: number | null = null;
    currentUserUnidadName: string = '';

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    filterValues = {
        fecha: '',
        gasto: '',
        tipo: '',
        concepto: '',
        subtipo: '',
        unidad: '',
        area: '',
        proveedor: '',
        factura: '',
        formaPago: '',
        cuenta: ''
    };

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _expensesService: ExpensesService,
        private _fb: FormBuilder
    ) { }

    ngOnInit(): void {
        this._initForm();
        this._loadUserUnidad();

        // 1. Configurar el predicado de filtro primero
        this.dataSource.filterPredicate = this._createFilterPredicate();

        // 2. Escuchar cambios en los datos (Suscribirse al BehaviorSubject del servicio)
        this._expensesService.expenses$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((expenses: Expense[]) => {
                this.dataSource.data = expenses;
                // Aplicar filtros existentes si los hay
                const filterState = JSON.stringify(this.filterValues);
                this.dataSource.filter = filterState !== JSON.stringify(this._emptyFilter()) ? filterState : '';
                this._changeDetectorRef.markForCheck();
            });

        // 3. SECUENCIA DE CARGA: Primero Catálogos, luego Gastos
        forkJoin({
            catalogos: this._expensesService.getCatalogos(),
            unidades: this._expensesService.getUnidadesNegocio()
        })
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (res) => {
                    // Guardamos los catálogos primero
                    this.catalogs = res.catalogos;
                    this.unidadesNegocio = res.unidades;

                    this._changeDetectorRef.markForCheck();

                    // 4. Una vez tenemos los catálogos, cargamos los gastos
                    this._expensesService.getExpenses(this.currentUserUnidadId).subscribe();
                },
                error: (err) => {
                    console.error('Error cargando catálogos', err);
                }
            });

        // 5. Filtro Global
        this.searchInputControl.valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((value) => {
                this._resetColumnFilters();
                this.dataSource.filter = value.trim().toLowerCase();
            });
    }

    // Función auxiliar para comparar filtros vacíos
    private _emptyFilter() {
        return { fecha: '', gasto: '', tipo: '', concepto: '', subtipo: '', unidad: '', area: '', proveedor: '', factura: '', formaPago: '', cuenta: '' };
    }

    // 🔹 NUEVO: Función para aplicar filtro desde el encabezado
    applyColumnFilter(column: string, value: string): void {
        this.filterValues[column] = value.trim().toLowerCase();
        this.dataSource.filter = JSON.stringify(this.filterValues);
    }

    // 🔹 NUEVO: Predicado de filtro personalizado
    private _createFilterPredicate(): (data: Expense, filter: string) => boolean {
        return (data: Expense, filter: string): boolean => {
            // Si el filtro no es un JSON (es del buscador global)
            if (!filter.startsWith('{')) {
                const searchStr = (data.nombreGasto + data.factura + this.getProveedorNombre(data.proveedorId)).toLowerCase();
                return searchStr.indexOf(filter) !== -1;
            }

            // Si es filtro por columnas
            const searchTerms = JSON.parse(filter);

            const matchFecha = moment(data.fecha).format('DD/MM/YYYY').includes(searchTerms.fecha);
            const matchGasto = data.nombreGasto?.toLowerCase().includes(searchTerms.gasto);
            const matchTipo = this.getTipoNombre(data.tipoId).toLowerCase().includes(searchTerms.tipo);
            const matchConcepto = this.getConceptoNombre(data.conceptoId).toLowerCase().includes(searchTerms.concepto);
            const matchSubtipo = this.getSubtipoNombre(data.subtipoId).toLowerCase().includes(searchTerms.subtipo);
            const matchArea = this.getAreaNombre(data.areaId).toLowerCase().includes(searchTerms.area);
            const matchProveedor = this.getProveedorNombre(data.proveedorId).toLowerCase().includes(searchTerms.proveedor);
            const matchFactura = data.factura?.toLowerCase().includes(searchTerms.factura);
            const matchFP = this.getFormaPagoNombre(data.formaPagoId).toLowerCase().includes(searchTerms.formaPago);
            const matchCuenta = this.getCuentaNombre(data.cuentaId).toLowerCase().includes(searchTerms.cuenta);
            const matchUnidad = this.getUnidadNombre(data.unidadId).toLowerCase().includes(searchTerms.unidad);

            return matchFecha && matchGasto && matchTipo && matchConcepto &&
                matchSubtipo && matchArea && matchProveedor && matchFactura &&
                matchFP && matchCuenta && matchUnidad;
        };
    }

    public _resetColumnFilters(): void {
        this.filterValues = {
            fecha: '', gasto: '', tipo: '', concepto: '', subtipo: '',
            unidad: '', area: '', proveedor: '', factura: '', formaPago: '', cuenta: ''
        };
    }

    private _initForm(): void {
        this.rowForm = this._fb.group({
            gastoId: [0],
            fecha: [moment(), Validators.required],
            nombreGasto: ['', Validators.required],
            tipoId: [{ value: null, disabled: false }, Validators.required],
            conceptoId: [{ value: null, disabled: true }, Validators.required],
            subtipoId: [{ value: null, disabled: true }, Validators.required],
            areaId: [{ value: null, disabled: true }, Validators.required],
            proveedorId: [{ value: null, disabled: true }, Validators.required],
            formaPagoId: [{ value: null, disabled: true }, Validators.required],
            cuentaId: [{ value: null, disabled: true }, Validators.required],
            cantidad: [0, [Validators.required, Validators.min(0.01)]],
            factura: ['', Validators.required],
            tasaId: [null, Validators.required],
            descripcion: [''],
            impuestos: [{ value: 0, disabled: true }]
        });

        // 🔹 CADENA DE DESBLOQUEO SECUENCIAL (Selects)

        // Tipo -> Concepto
        this.rowForm.get('tipoId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('conceptoId');
            if (val != null) {
                nextCtrl.enable();
            } else {
                this._disableChain(['conceptoId', 'subtipoId', 'areaId', 'proveedorId', 'formaPagoId', 'cuentaId']);
            }
            this._changeDetectorRef.detectChanges();
        });

        // Concepto -> Subtipo
        this.rowForm.get('conceptoId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('subtipoId');
            if (val != null) {
                nextCtrl.enable();
            } else {
                this._disableChain(['subtipoId', 'areaId', 'proveedorId', 'formaPagoId', 'cuentaId']);
            }
            this._changeDetectorRef.detectChanges();
        });

        // Subtipo -> Area
        this.rowForm.get('subtipoId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('areaId');
            val != null ? nextCtrl.enable() : this._disableChain(['areaId', 'proveedorId', 'formaPagoId', 'cuentaId']);
            this._changeDetectorRef.detectChanges();
        });

        // Area -> Proveedor
        this.rowForm.get('areaId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('proveedorId');
            val != null ? nextCtrl.enable() : this._disableChain(['proveedorId', 'formaPagoId', 'cuentaId']);
            this._changeDetectorRef.detectChanges();
        });

        // Proveedor -> Forma Pago
        this.rowForm.get('proveedorId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('formaPagoId');
            val != null ? nextCtrl.enable() : this._disableChain(['formaPagoId', 'cuentaId']);
            this._changeDetectorRef.detectChanges();
        });

        // Forma Pago -> Cuenta
        this.rowForm.get('formaPagoId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('cuentaId');
            val != null ? nextCtrl.enable() : this._disableChain(['cuentaId']);
            this._changeDetectorRef.detectChanges();
        });

        // Cálculos de impuestos
        this.rowForm.get('cantidad').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(() => this._calculateTax());
        this.rowForm.get('tasaId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(() => this._calculateTax());
    }

    private _disableChain(controls: string[]): void {
        controls.forEach(name => {
            const ctrl = this.rowForm.get(name);
            ctrl.disable();
            ctrl.setValue(null);
        });
    }

    private _calculateTax(): void {
        const cantidad = this.rowForm.get('cantidad').value || 0;
        const tasaId = this.rowForm.get('tasaId').value;
        if (tasaId && this.catalogs?.tasas) {
            const tasaObj = this.catalogs.tasas.find(t => t.tasaId === tasaId);
            if (tasaObj) {
                const impuestoCalculado = Number((cantidad * (tasaObj.valor / 100)).toFixed(2));
                this.rowForm.get('impuestos').setValue(impuestoCalculado, { emitEvent: false });
            }
        }
    }

    async addNew(): Promise<void> {
        if (this.isAdding) return;
        this.isAdding = true;
        this.editingId = 0;

        // Re-leer unidad actual por si cambió en la sesión
        this._loadUserUnidad();

        this.rowForm.reset();
        this.rowForm.patchValue({
            gastoId: 0,
            fecha: moment(),
            cantidad: 0,
            unidadId: this.currentUserUnidadId
        });

        this._disableChain(['conceptoId', 'subtipoId', 'areaId', 'proveedorId', 'formaPagoId', 'cuentaId']);

        const newData = [{ gastoId: 0, unidadId: this.currentUserUnidadId } as Expense, ...this.dataSource.data];
        this.dataSource.data = newData;
        this._changeDetectorRef.markForCheck();
    }

    editExpense(expense: Expense): void {
        this.editingId = expense.gastoId;
        this.isAdding = false;

        // Reset state and enable based on values
        this._disableChain(['conceptoId', 'subtipoId', 'areaId', 'proveedorId', 'formaPagoId', 'cuentaId']);

        if (expense.tipoId != null) {
            this.rowForm.get('conceptoId').enable();
            if (expense.conceptoId != null) {
                this.rowForm.get('subtipoId').enable();
                if (expense.subtipoId != null) {
                    this.rowForm.get('areaId').enable();
                    if (expense.areaId != null) {
                        this.rowForm.get('proveedorId').enable();
                        if (expense.proveedorId != null) {
                            this.rowForm.get('formaPagoId').enable();
                            if (expense.formaPagoId != null) {
                                this.rowForm.get('cuentaId').enable();
                            }
                        }
                    }
                }
            }
        }

        this.rowForm.patchValue(expense);
        this._changeDetectorRef.detectChanges();
    }

    cancelEdit(): void {
        if (this.isAdding) {
            this.dataSource.data = this.dataSource.data.filter(x => x.gastoId !== 0);
        }
        this.editingId = null;
        this.isAdding = false;
        this.rowForm.reset();
        this._changeDetectorRef.markForCheck();
    }

    saveRow(): void {
        if (this.rowForm.invalid) {
            this.rowForm.markAllAsTouched();
            return;
        }

        const data = this.rowForm.getRawValue();

        // Obtener información de sesión actualizada para guardar
        this._loadUserUnidad();
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            data.unidadId = this.currentUserUnidadId;
            data.usuarioId = user.id || 0;
        } catch (e) { }

        const request = this.isAdding
            ? this._expensesService.createExpense(data)
            : this._expensesService.updateExpense(data.gastoId, data);

        request.subscribe({
            next: () => {
                this.editingId = null;
                this.isAdding = false;
                this._expensesService.getExpenses(this.currentUserUnidadId).subscribe();
                Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
            }
        });
    }

    viewExpense(expense: Expense): void {
        this.selectedExpense = expense;
        this.matDrawer.open();
        this._changeDetectorRef.markForCheck();
    }

    deleteExpense(id: number): void {
        if (id === 0) {
            this.dataSource.data = this.dataSource.data.filter(x => x.gastoId !== 0);
            this.editingId = null;
            this.isAdding = false;
            return;
        }

        Swal.fire({
            title: '¿Eliminar registro?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._expensesService.deleteExpense(id).subscribe(() => {
                    this._expensesService.getExpenses(this.currentUserUnidadId).subscribe();
                    Swal.fire('Eliminado', '', 'success');
                });
            }
        });
    }

    getMes(fecha: any): string {
        return moment(fecha).format('MMMM');
    }

    getYear(fecha: any): string {
        return moment(fecha).format('YYYY');
    }

    getUnidadNombre(unidadId: number): string {
        // Prioridad 1: Buscar en el catálogo de unidades cargado (es lo más fiable)
        if (this.unidadesNegocio && this.unidadesNegocio.length > 0) {
            const unidad = this.unidadesNegocio.find(u => u.id == unidadId);
            if (unidad) return unidad.nombre;
        }

        // Prioridad 2: Si el ID coincide con el usuario actual y tenemos el nombre de sesión, usarlo como fallback
        if (unidadId == this.currentUserUnidadId && this.currentUserUnidadName) {
            return this.currentUserUnidadName;
        }

        return (this.unidadesNegocio && this.unidadesNegocio.length > 0) ? 'N/A' : 'Cargando...';
    }

    getTipoNombre(id: number): string {
        return this.catalogs?.tipos?.find(i => i.tipoId == id)?.nombre || 'N/A';
    }

    getConceptoNombre(id: number): string {
        return this.catalogs?.conceptos?.find(i => i.conceptoId == id)?.nombre || 'N/A';
    }

    getSubtipoNombre(id: number): string {
        return this.catalogs?.subtipos?.find(i => i.subtipoId == id)?.nombre || 'N/A';
    }

    getAreaNombre(id: number): string {
        return this.catalogs?.areas?.find(i => i.areaId == id)?.nombre || 'N/A';
    }

    getProveedorNombre(id: number): string {
        return this.catalogs?.proveedores?.find(i => i.proveedorId == id)?.nombre || 'N/A';
    }

    getFormaPagoNombre(id: number): string {
        return this.catalogs?.formasPago?.find(i => i.formaPagoId == id)?.nombre || 'N/A';
    }

    getCuentaNombre(id: number): string {
        return this.catalogs?.cuentas?.find(i => i.cuentaId == id)?.nombre || 'N/A';
    }

    private _loadUserUnidad(): void {
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const unidad = userInformation.usuario?.unidadNegocio || userInformation;

            this.currentUserUnidadId = unidad.id || unidad.unidadId || 1;
            this.currentUserUnidadName = unidad.nombre || 'N/A';
        } catch (e) {
            console.error('Error al obtener unidadId de localStorage', e);
            this.currentUserUnidadId = 1;
            this.currentUserUnidadName = 'N/A';
        }
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}