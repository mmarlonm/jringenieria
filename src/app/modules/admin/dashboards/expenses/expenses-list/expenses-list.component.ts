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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil, map, startWith, forkJoin } from 'rxjs';
import { ExpensesService } from '../expenses.service';
import { Expense, ExpenseCatalogs, GastoSubtipo } from '../models/expenses.types';
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
        MatAutocompleteModule,
        CurrencyPipe,
        DatePipe
    ],
})
export class ExpensesListComponent implements OnInit, OnDestroy {

    @ViewChild('matDrawer') matDrawer: MatDrawer;

    dataSource: MatTableDataSource<Expense> = new MatTableDataSource();
    displayedColumns: string[] = [
        'unidad', 'tipoMovimiento', 'fecha', 'gasto', 'concepto', 'subtipo', 'tipo', 'area', 'cuenta', 'numeroCuenta', 'formaPago',
        'proveedor', 'factura', 'folioFiscal', 'tipoComprobante', 'moneda', 'descripcion',
        'impuestos', 'tasa', 'mes', 'año', 'registro', 'acciones'
    ];
    searchInputControl: FormControl = new FormControl('');

    // Edición Inline
    editingId: number | null = null;
    isAdding: boolean = false;
    rowForm: FormGroup;
    catalogs: ExpenseCatalogs;
    subtiposFiltrados: GastoSubtipo[] = []; // Para el formulario de edición
    filteredSubtiposHeader: GastoSubtipo[] = []; // Para el filtro del encabezado
    filteredNumerosCuentaHeader: string[] = []; // Para el filtro del encabezado (No. Cuenta)
    numerosCuentaFiltrados: string[] = []; // 👈 Nueva cascada para cuentas
    filteredProveedores: any[] = []; // 👈 Para el autocomplete
    selectedExpense: Expense | null = null;

    // 👈 Mapeo estático según requerimiento
    accountNumbersMap: { [key: string]: string[] } = {
        'JR INGENIERIA': ['124948939', '124949706'],
        'JESUS MENDEZ': ['4772143013658287', '477133059607769', '1200449415', '197590067', '478628203'],
        'COLABORADOR': []
    };
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
        cuenta: '',
        tipoMovimiento: '',
        folioFiscal: '',
        tipoComprobante: '',
        moneda: '',
        numeroCuenta: '',
        descripcion: '',
        mes: '',
        anio: ''
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

                    this.subtiposFiltrados = res.catalogos?.subtipos || [];
                    this.filteredSubtiposHeader = res.catalogos?.subtipos || [];

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

    applyDateFilter(event: any): void {
        const date = event.value;
        const formattedDate = date ? moment(date).format('DD/MM/YYYY') : '';
        this.applyColumnFilter('fecha', formattedDate);
    }

    // Función auxiliar para comparar filtros vacíos
    private _emptyFilter() {
        return { fecha: '', gasto: '', tipo: '', concepto: '', subtipo: '', unidad: '', area: '', proveedor: '', factura: '', formaPago: '', cuenta: '', tipoMovimiento: '' };
    }

    // 🔹 NUEVO: Función para aplicar filtro desde el encabezado
    applyColumnFilter(column: string, value: string): void {
        const val = value ? value.trim().toLowerCase() : '';
        this.filterValues[column] = val;

        // Cascada en Filtros del Encabezado
        if (column === 'concepto') {
            if (val) {
                const conceptObj = this.catalogs?.conceptos?.find(c => c.nombre.toLowerCase() === val);
                if (conceptObj) {
                    this.filteredSubtiposHeader = this.catalogs?.subtipos?.filter(s => s.conceptoId == conceptObj.conceptoId) || [];
                } else {
                    this.filteredSubtiposHeader = this.catalogs?.subtipos || [];
                }
            } else {
                this.filteredSubtiposHeader = this.catalogs?.subtipos || [];
            }
        }

        if (column === 'cuenta') {
            if (val) {
                const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                const nombreNormalizado = normalize(val);

                const matchingKey = Object.keys(this.accountNumbersMap).find(key =>
                    nombreNormalizado.includes(normalize(key))
                );
                this.filteredNumerosCuentaHeader = matchingKey ? this.accountNumbersMap[matchingKey] : [];
            } else {
                this.filteredNumerosCuentaHeader = [];
            }
        }

        this.dataSource.filter = JSON.stringify(this.filterValues);
        this._changeDetectorRef.detectChanges();
    }

    // 🔹 NUEVO: Predicado de filtro personalizado
    private _createFilterPredicate(): (data: Expense, filter: string) => boolean {
        return (data: Expense, filter: string): boolean => {
            if (data.gastoId === 0) return true;

            // Si el filtro no es un JSON (es del buscador global)
            if (!filter.startsWith('{')) {
                const searchStr = (
                    (data.nombreGasto || '') +
                    (data.factura || '') +
                    (data.folioFiscal || '') +
                    (data.gastoProveedor?.nombre || '')
                ).toLowerCase();
                return searchStr.indexOf(filter) !== -1;
            }

            // Si es filtro por columnas
            const searchTerms = JSON.parse(filter);

            const matchFecha = !searchTerms.fecha || moment(data.fecha).format('DD/MM/YYYY').includes(searchTerms.fecha);
            const matchGasto = !searchTerms.gasto || data.cantidad?.toString().includes(searchTerms.gasto);
            const matchTipo = !searchTerms.tipo || (data.gastoTipo?.nombre || '').toLowerCase().includes(searchTerms.tipo);
            const matchConcepto = !searchTerms.concepto || (data.gastoConcepto?.nombre || '').toLowerCase().includes(searchTerms.concepto);
            const matchSubtipo = !searchTerms.subtipo || (data.gastoSubtipo?.nombre || '').toLowerCase().includes(searchTerms.subtipo);
            const matchArea = !searchTerms.area || (data.gastoArea?.nombre || '').toLowerCase().includes(searchTerms.area);
            const matchProveedor = !searchTerms.proveedor || (data.gastoProveedor?.nombre || '').toLowerCase().includes(searchTerms.proveedor);
            const matchFactura = !searchTerms.factura || (data.factura || '').toLowerCase().includes(searchTerms.factura);
            const matchFP = !searchTerms.formaPago || (data.gastoFormaPago?.nombre || '').toLowerCase().includes(searchTerms.formaPago);
            const matchCuenta = !searchTerms.cuenta || (data.gastoCuenta?.nombre || '').toLowerCase().includes(searchTerms.cuenta);
            const matchUnidad = !searchTerms.unidad || (data.gastoUnidad?.nombre || '').toLowerCase().includes(searchTerms.unidad);
            const matchTM = !searchTerms.tipoMovimiento || data.tipoMovimiento?.toString() === searchTerms.tipoMovimiento;

            const matchFolio = !searchTerms.folioFiscal || (data.folioFiscal || '').toLowerCase().includes(searchTerms.folioFiscal);
            const matchComprobante = !searchTerms.tipoComprobante || (data.tipoComprobante || '').toLowerCase().includes(searchTerms.tipoComprobante);
            const matchMoneda = !searchTerms.moneda || (data.moneda || '').toLowerCase().includes(searchTerms.moneda);
            const matchNumCuenta = !searchTerms.numeroCuenta || (data.numeroCuenta || '').toLowerCase().includes(searchTerms.numeroCuenta);
            const matchDesc = !searchTerms.descripcion || ((data.nombreGasto || '') + ' ' + (data.descripcion || '')).toLowerCase().includes(searchTerms.descripcion);

            return matchFecha && matchGasto && matchTipo && matchConcepto &&
                matchSubtipo && matchArea && matchProveedor && matchFactura &&
                matchFP && matchCuenta && matchUnidad && matchTM &&
                matchFolio && matchComprobante && matchMoneda && matchNumCuenta && matchDesc;
        };
    }

    public _resetColumnFilters(): void {
        this.filterValues = {
            fecha: '', gasto: '', tipo: '', concepto: '', subtipo: '',
            unidad: '', area: '', proveedor: '', factura: '', formaPago: '', cuenta: '', tipoMovimiento: '',
            folioFiscal: '', tipoComprobante: '', moneda: '', numeroCuenta: '', descripcion: '',
            mes: '', anio: ''
        };
        this.dataSource.filter = '';
    }

    private _initForm(): void {
        this.rowForm = this._fb.group({
            gastoId: [0],
            fecha: [moment(), Validators.required],
            nombreGasto: ['', Validators.required],
            unidadId: [null, Validators.required], // 👈 AÑADIDO
            tipoId: [{ value: null, disabled: false }, Validators.required],
            conceptoId: [{ value: null, disabled: true }, Validators.required],
            subtipoId: [{ value: null, disabled: true }, Validators.required],
            areaId: [{ value: null, disabled: true }, Validators.required],
            proveedor: [{ value: null, disabled: true }, Validators.required],
            formaPagoId: [{ value: null, disabled: true }, Validators.required],
            cuentaId: [{ value: null, disabled: true }, Validators.required],
            cantidad: [0, [Validators.required, Validators.min(0.01)]],
            factura: ['', Validators.required],
            tipoMovimiento: [null],
            tasaId: [null, Validators.required],
            descripcion: [''],
            impuestos: [{ value: 0, disabled: true }],
            // 👈 NUEVOS CAMPOS FISCALES
            folioFiscal: [''],
            tipoComprobante: [''],
            moneda: ['MXN', Validators.required],
            numeroCuenta: ['']
        });

        // 🔹 CADENA DE DESBLOQUEO SECUENCIAL (Selects)

        // Tipo -> Concepto
        this.rowForm.get('tipoId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('conceptoId');
            if (val != null) {
                nextCtrl.enable();
            } else {
                this._disableChain(['conceptoId', 'subtipoId', 'areaId', 'proveedor', 'formaPagoId', 'cuentaId']);
            }
            this._changeDetectorRef.detectChanges();
        });

        // Concepto -> Subtipo
        this.rowForm.get('conceptoId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('subtipoId');
            if (val != null) {
                this.subtiposFiltrados = this.catalogs?.subtipos?.filter(s => s.conceptoId == val) || [];
                nextCtrl.enable();
            } else {
                this.subtiposFiltrados = this.catalogs?.subtipos || [];
                this._disableChain(['subtipoId', 'areaId', 'proveedor', 'formaPagoId', 'cuentaId']);
            }
            this._changeDetectorRef.detectChanges();
        });

        // Subtipo -> Area
        this.rowForm.get('subtipoId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('areaId');
            val != null ? nextCtrl.enable() : this._disableChain(['areaId', 'proveedor', 'formaPagoId', 'cuentaId']);
            this._changeDetectorRef.detectChanges();
        });

        // Area -> Proveedor
        this.rowForm.get('areaId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            const nextCtrl = this.rowForm.get('proveedor');
            val != null ? nextCtrl.enable() : this._disableChain(['proveedor', 'formaPagoId', 'cuentaId']);
            this._changeDetectorRef.detectChanges();
        });

        // Proveedor -> Forma Pago
        this.rowForm.get('proveedor').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
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

        // 🔹 Cuenta -> Numero de Cuenta (Cascada)
        this.rowForm.get('cuentaId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            this._onCuentaChange(val);
        });

        // Cálculos de impuestos
        this.rowForm.get('cantidad').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(() => this._calculateTax());
        this.rowForm.get('tasaId').valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(() => this._calculateTax());

        // Autocomplete de Proveedor
        this.rowForm.get('proveedor').valueChanges.pipe(
            takeUntil(this._unsubscribeAll),
            startWith(''),
            map(value => typeof value === 'string' ? value : value?.nombre)
        ).subscribe(val => {
            this.filteredProveedores = this._filterProveedores(val || '');
            this._changeDetectorRef.markForCheck();
        });
    }

    private _filterProveedores(value: string): any[] {
        const filterValue = value.toLowerCase();
        return this.catalogs?.proveedores?.filter(p => p.nombre.toLowerCase().includes(filterValue)) || [];
    }

    displayProveedorFn(id: any): string {
        if (!id) return '';
        if (typeof id === 'string') return id;
        if (!this.catalogs?.proveedores) return '';
        return this.catalogs.proveedores.find(p => p.proveedorId === id)?.nombre || '';
    }

    private _disableChain(controls: string[]): void {
        controls.forEach(name => {
            const ctrl = this.rowForm.get(name);
            ctrl.disable();
            ctrl.setValue(null);
        });
    }

    private _onCuentaChange(cuentaId: number): void {
        const ctrl = this.rowForm.get('numeroCuenta');
        if (!cuentaId || !this.catalogs?.cuentas) {
            this.numerosCuentaFiltrados = [];
            return;
        }

        const cuentaObj = this.catalogs.cuentas.find(c => c.cuentaId == cuentaId);
        if (cuentaObj) {
            // Normalización para ignorar acentos y mayúsculas
            const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const nombreNormalizado = normalize(cuentaObj.nombre);

            // Buscamos si alguna de nuestras claves está contenida en el nombre de la cuenta
            const matchingKey = Object.keys(this.accountNumbersMap).find(key =>
                nombreNormalizado.includes(normalize(key))
            );

            this.numerosCuentaFiltrados = matchingKey ? this.accountNumbersMap[matchingKey] : [];
        } else {
            this.numerosCuentaFiltrados = [];
        }
        this._changeDetectorRef.detectChanges();
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

    addNew(): void {
        if (this.isAdding) return;
        this.isAdding = true;
        this.editingId = 0;

        // Limpiar filtros para que el nuevo registro sea visible
        this._resetColumnFilters();
        this.searchInputControl.setValue('', { emitEvent: false });
        this.dataSource.filter = '';

        // Re-leer unidad actual por si cambió en la sesión
        this._loadUserUnidad();

        this.rowForm.reset();
        this.rowForm.patchValue({
            gastoId: 0,
            fecha: moment(),
            nombreGasto: '',
            cantidad: 0,
            moneda: 'MXN',
            tipoMovimiento: 2,
            tipoComprobante: 'I',
            unidadId: this.currentUserUnidadId
        });

        this._disableChain(['conceptoId', 'subtipoId', 'areaId', 'proveedor', 'formaPagoId', 'cuentaId']);

        const newData = [{ gastoId: 0, unidadId: this.currentUserUnidadId } as Expense, ...this.dataSource.data];
        this.dataSource.data = newData;
        this._changeDetectorRef.markForCheck();
    }

    editExpense(expense: Expense): void {
        this.editingId = expense.gastoId;
        this.isAdding = false;

        this._disableChain(['conceptoId', 'subtipoId', 'areaId', 'proveedor', 'formaPagoId', 'cuentaId']);

        if (expense.tipoId != null) {
            this.rowForm.get('conceptoId').enable();
            if (expense.conceptoId != null) {
                this.rowForm.get('subtipoId').enable();
                if (expense.subtipoId != null) {
                    this.rowForm.get('areaId').enable();
                    if (expense.areaId != null) {
                        this.rowForm.get('proveedor').enable();
                        if (expense.proveedor != null) {
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
        if (expense.conceptoId != null) {
            this.subtiposFiltrados = this.catalogs?.subtipos?.filter(s => s.conceptoId == expense.conceptoId) || [];
        } else {
            this.subtiposFiltrados = this.catalogs?.subtipos || [];
        }

        // Cargar números de cuenta al editar
        if (expense.cuentaId) {
            this._onCuentaChange(expense.cuentaId);
        }

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

        // 🔹 Corrección para API: Mapeo PascalCase completo y Proveedor Único
        // En la nueva convención 'Proveedor' recibe tanto ID como Nombre manual

        // Asegurar que tipoMovimiento sea numérico
        if (data.tipoMovimiento) {
            data.tipoMovimiento = parseInt(data.tipoMovimiento, 10);
        }

        // Obtener información de usuario para el registro
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = userInformation.usuario || {};
            data.usuarioId = user.id || 0;
        } catch (e) { }

        // Mapeo a PascalCase para compatibilidad con la API de C#
        const payload: any = {
            GastoId: data.gastoId,
            Fecha: data.fecha,
            NombreGasto: data.nombreGasto,
            Cantidad: data.cantidad,
            Impuestos: data.impuestos,
            TipoId: data.tipoId,
            ConceptoId: data.conceptoId,
            SubtipoId: data.subtipoId,
            AreaId: data.areaId,
            Proveedor: data.proveedor, // 👈 UNIFICADO: Ya no existe ProveedorId/Nombre
            FormaPagoId: data.formaPagoId,
            CuentaId: data.cuentaId,
            TasaId: data.tasaId,
            UnidadId: data.unidadId,
            UsuarioId: data.usuarioId,
            Factura: data.factura,
            NumeroCuenta: data.numeroCuenta,
            Descripcion: data.descripcion,
            TipoMovimiento: data.tipoMovimiento,
            FolioFiscal: data.folioFiscal,
            TipoComprobante: data.tipoComprobante,
            Moneda: data.moneda
        };

        const request = this.isAdding
            ? this._expensesService.createExpense(payload)
            : this._expensesService.updateExpense(payload.GastoId, payload);

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

    getProveedorNombre(val: any): string {
        if (!val) return 'N/A';
        if (typeof val === 'string') return val;
        return this.catalogs?.proveedores?.find(i => i.proveedorId == val)?.nombre || 'N/A';
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
            const user = userInformation.usuario || {};
            const unidad = user.unidadNegocio || userInformation.unidadNegocio || {};

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