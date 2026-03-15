import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { catchError, debounceTime, distinctUntilChanged, map, merge, of, startWith, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExpensesService } from '../expenses.service';
import { Expense, ExpenseCatalogs, GastoSubtipo } from '../models/expenses.types';
import Swal from 'sweetalert2';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';

@Component({
    selector: 'expense-form',
    templateUrl: './expenses-form.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        MatTooltipModule
    ]
})
export class ExpenseFormComponent implements OnInit, OnDestroy {
    expenseForm: FormGroup;
    catalogs: ExpenseCatalogs;
    todosLosSubtipos: GastoSubtipo[] = []; // 👈 Guardar todos
    subtiposFiltrados: GastoSubtipo[] = []; // 👈 Mostrar en el select
    numerosCuentaFiltrados: string[] = []; // 👈 Nueva cascada para cuentas
    filteredProveedores: any[] = []; // 👈 Para el autocomplete
    filteredFoliosFactura: any[] = []; // 👈 Para búsqueda por Folio/Factura
    filteredFoliosUUID: any[] = []; // 👈 Para búsqueda por UUID/FolioFiscal
    isEdit: boolean = false;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // 👈 Mapeo estático según requerimiento
    accountNumbersMap: { [key: string]: string[] } = {
        'JR INGENIERIA': ['124948939', '124949706'],
        'JESUS MENDEZ': ['4772143013658287', '477133059607769', '1200449415', '197590067', '478628203'],
        'COLABORADOR': []
    };
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { expense: Expense | null },
        // 🔹 Cambia 'private _dialogRef' por 'public dialogRef'
        public dialogRef: MatDialogRef<ExpenseFormComponent>,
        private _fb: FormBuilder,
        private _expensesService: ExpensesService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _chatNotificationService: ChatNotificationService
    ) {
        this.isEdit = !!data.expense;
    }

    ngOnInit(): void {
        // Inicializar formulario
        this.expenseForm = this._fb.group({
            gastoId: [0],
            fecha: [new Date(), Validators.required],
            nombreGasto: ['', [Validators.required, Validators.maxLength(255)]],
            cantidad: [0, [Validators.required, Validators.min(0.01)]],
            tasaId: [null, Validators.required],
            impuestos: [{ value: 0, disabled: true }],
            tipoId: [null, Validators.required],
            unidadId: [null, Validators.required], // 👈 AÑADIDO
            conceptoId: [null, Validators.required],
            subtipoId: [null, Validators.required],
            areaId: [null, Validators.required],
            proveedor: [null, Validators.required],
            formaPagoId: [null, Validators.required],
            cuentaId: [null, Validators.required],
            factura: [''],
            // 👈 NUEVOS CAMPOS FISCALES
            folioFiscal: [''],
            tipoComprobante: ['I'], // I, E, P
            moneda: ['MXN'], // Por defecto MXN
            numeroCuenta: [''],
            descripcion: [''],
            tipoMovimiento: [2] // Default Egreso (Numeric)
        });

        // Suscribirse a los catálogos con protección de nulos
        this._expensesService.catalogs$.subscribe(cat => {
            if (cat) {
                this.catalogs = cat;
                this.todosLosSubtipos = cat.subtipos || [];

                // Cargar unidades si no vienen en el catálogo principal
                if (!this.catalogs.unidades) {
                    this._expensesService.getUnidadesNegocio().subscribe(unidades => {
                        this.catalogs.unidades = unidades;
                        this._changeDetectorRef.markForCheck();
                    });
                }

                // Si ya hay un concepto seleccionado (Edición), filtrar subtipos
                const conceptoId = this.expenseForm.get('conceptoId').value;
                if (conceptoId) {
                    this.subtiposFiltrados = this.todosLosSubtipos.filter(s => s.conceptoId == conceptoId);
                }

                // Si ya hay una cuenta seleccionada (Edición), filtrar números
                const cuentaId = this.expenseForm.get('cuentaId').value;
                if (cuentaId) {
                    this.onCuentaChange(cuentaId);
                }

                this._changeDetectorRef.markForCheck();
            }
        });

        if (this.isEdit && this.data.expense) {
            // Cargar los subtipos correspondientes al concepto antes de patchear
            if (this.data.expense.conceptoId) {
                this.subtiposFiltrados = this.todosLosSubtipos.filter(s => s.conceptoId === this.data.expense.conceptoId);
            }
            this.expenseForm.patchValue(this.data.expense);
        }

        // Suscripción a cambios para impuestos
        this.expenseForm.get('cantidad').valueChanges.subscribe(() => this._calculateTax());
        this.expenseForm.get('tasaId').valueChanges.subscribe(() => this._calculateTax());

        // 🔹 CADENA DE DESBLOQUEO SECUENCIAL (Selects) - Igual que en la lista para consistencia

        // Tipo -> Concepto
        this.expenseForm.get('tipoId').valueChanges.subscribe(val => {
            const ctrl = this.expenseForm.get('conceptoId');
            val != null ? ctrl.enable() : this._disableChain(['conceptoId', 'subtipoId', 'areaId', 'proveedor', 'formaPagoId', 'cuentaId']);
        });

        // Concepto -> Subtipo (Este ya tiene onConceptoChange en el HTML, pero aseguramos estado aquí)
        this.expenseForm.get('conceptoId').valueChanges.subscribe(val => {
            const ctrl = this.expenseForm.get('subtipoId');
            if (val != null) {
                this.subtiposFiltrados = this.todosLosSubtipos.filter(s => s.conceptoId == val);
                ctrl.enable();
            } else {
                this.subtiposFiltrados = this.todosLosSubtipos;
                this._disableChain(['subtipoId', 'areaId', 'proveedor', 'formaPagoId', 'cuentaId']);
            }
            this._changeDetectorRef.markForCheck();
        });

        // 🔹 Cuenta -> Numero de Cuenta (Cascada)
        this.expenseForm.get('cuentaId').valueChanges.subscribe(val => {
            this.onCuentaChange(val);
        });

        // Autocomplete de Proveedor
        this.expenseForm.get('proveedor').valueChanges.pipe(
            startWith(''),
            map(value => typeof value === 'string' ? value : value?.nombre)
        ).subscribe(val => {
            this.filteredProveedores = this._filterProveedores(val || '');
            this._changeDetectorRef.markForCheck();
        });

        // 🔹 Búsqueda en tiempo real para Factura
        this.expenseForm.get('factura').valueChanges.pipe(
            debounceTime(2000),
            switchMap(val => {
                // Si es un objeto (seleccionado), no buscamos
                if (typeof val !== 'string') return of([]);

                const query = val.trim();
                console.log('[CONTPAQ] Buscando Factura:', query);

                if (query.length >= 1) {
                    return this._expensesService.buscarFoliosContpaq(query).pipe(
                        catchError(err => {
                            console.error('[CONTPAQ] Error en búsqueda Factura:', err);
                            return of([]);
                        })
                    );
                }
                return of([]);
            }),
            takeUntil(this._unsubscribeAll)
        ).subscribe(res => {
            console.log('[CONTPAQ] Resultados Factura:', res);
            this.filteredFoliosFactura = res;
            this._changeDetectorRef.markForCheck();
        });

        // 🔹 Búsqueda en tiempo real para Folio Fiscal
        this.expenseForm.get('folioFiscal').valueChanges.pipe(
            debounceTime(2000),
            switchMap(val => {
                if (typeof val !== 'string') return of([]);

                const query = val.trim();
                console.log('[CONTPAQ] Buscando UUID:', query);

                if (query.length >= 1) {
                    return this._expensesService.buscarFoliosContpaq(query).pipe(
                        catchError(err => {
                            console.error('[CONTPAQ] Error en búsqueda UUID:', err);
                            return of([]);
                        })
                    );
                }
                return of([]);
            }),
            takeUntil(this._unsubscribeAll)
        ).subscribe(res => {
            console.log('[CONTPAQ] Resultados UUID:', res);
            this.filteredFoliosUUID = res;
            this._changeDetectorRef.markForCheck();
        });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
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

    displayFolioFn(item: any): string {
        if (!item) return '';
        if (typeof item === 'string') return item;
        return item.folio || '';
    }

    private _disableChain(controls: string[]): void {
        controls.forEach(name => {
            const ctrl = this.expenseForm.get(name);
            if (ctrl) {
                ctrl.disable();
                ctrl.setValue(null);
            }
        });
    }

    private _calculateTax(): void {
        const cantidad = this.expenseForm.get('cantidad').value || 0;
        const tasaId = this.expenseForm.get('tasaId').value;

        if (tasaId && this.catalogs?.tasas) {
            const tasaObj = this.catalogs.tasas.find(t => t.tasaId === tasaId);
            if (tasaObj) {
                const impuestoCalculado = Number((cantidad * (tasaObj.valor / 100)).toFixed(2));
                this.expenseForm.get('impuestos').setValue(impuestoCalculado, { emitEvent: false });
            }
        }
    }

    save(): void {
        if (this.expenseForm.invalid) {
            this.expenseForm.markAllAsTouched();
            return;
        }

        const expenseData = this.expenseForm.getRawValue();

        // 🔹 Corrección para API: Mapeo PascalCase completo y Proveedor Único
        // En la nueva convención 'Proveedor' recibe tanto ID como Nombre manual

        // Asegurar que tipoMovimiento sea numérico
        if (expenseData.tipoMovimiento) {
            expenseData.tipoMovimiento = parseInt(expenseData.tipoMovimiento, 10);
        }

        // 🔹 Recuperar sesión (Unificado con la lista)
        try {
            const userInformation = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const user = userInformation.usuario || {};
            expenseData.usuarioId = user.id || 0;
            // No sobreescribimos unidadId porque ahora viene del formulario
        } catch (e) {
            console.error('Error en sesión', e);
        }

        // Mapeo a PascalCase para compatibilidad con la API de C#
        const payload: any = {
            GastoId: expenseData.gastoId,
            Fecha: expenseData.fecha,
            NombreGasto: expenseData.nombreGasto,
            Cantidad: expenseData.cantidad,
            Impuestos: expenseData.impuestos,
            TipoId: expenseData.tipoId,
            ConceptoId: expenseData.conceptoId,
            SubtipoId: expenseData.subtipoId,
            AreaId: expenseData.areaId,
            Proveedor: expenseData.proveedor, // 👈 UNIFICADO: Ya no existe ProveedorId/Nombre
            FormaPagoId: expenseData.formaPagoId,
            CuentaId: expenseData.cuentaId,
            TasaId: expenseData.tasaId,
            UnidadId: expenseData.unidadId,
            UsuarioId: expenseData.usuarioId,
            Factura: expenseData.factura,
            NumeroCuenta: expenseData.numeroCuenta,
            Descripcion: expenseData.descripcion,
            TipoMovimiento: expenseData.tipoMovimiento,
            FolioFiscal: expenseData.folioFiscal,
            TipoComprobante: expenseData.tipoComprobante,
            Moneda: expenseData.moneda
        };

        const request = this.isEdit
            ? this._expensesService.updateExpense(payload.GastoId, payload)
            : this._expensesService.createExpense(payload);

        request.subscribe({
            next: () => {
                this._chatNotificationService.showSuccess('Éxito', 'Guardado', 3000);
                this.dialogRef.close('saved');
            },
            error: () => this._chatNotificationService.showError('Error', 'No se pudo procesar el registro', 5000)
        });
    }

    /**
     * Lógica de Cascada: Filtrar subtipos por Concepto
     */
    onConceptoChange(conceptoId: number): void {
        if (conceptoId) {
            this.subtiposFiltrados = this.todosLosSubtipos.filter(s => s.conceptoId == conceptoId);
        } else {
            this.subtiposFiltrados = this.todosLosSubtipos;
        }

        // Limpiar el select de subtipo si cambió el concepto
        this.expenseForm.get('subtipoId').setValue(null);
        this._changeDetectorRef.markForCheck();
    }

    onCuentaChange(cuentaId: number): void {
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
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Al seleccionar un folio de CONTPAQi, prellenar el formulario
     */
    onFolioContpaqSelected(event: MatAutocompleteSelectedEvent): void {
        const option = event.option.value; // Objeto con folio, proveedor, rfc, etc.
        if (!option) return;

        this.filteredFoliosFactura = []; // Limpiar resultados
        this.filteredFoliosUUID = [];

        this._expensesService.getDetalleFolioContpaq(option.folio, option.rfc).subscribe({
            next: (detalle) => {
                if (!detalle) return;

                // Mapeo de moneda MXP -> MXN
                let moneda = detalle.moneda || 'MXN';
                if (moneda === 'MXP') moneda = 'MXN';

                // PatchValue al formulario
                this.expenseForm.patchValue({
                    fecha: detalle.fecha ? new Date(detalle.fecha) : new Date(),
                    cantidad: detalle.total || 0,
                    proveedor: detalle.proveedor || '',
                    folioFiscal: detalle.uuid || '',
                    moneda: moneda,
                    descripcion: detalle.concepto || '',
                    factura: detalle.folio || this.expenseForm.get('factura').value
                }, { emitEvent: false });

                // Recalcular impuestos y forzar detección de cambios
                this._calculateTax();
                this._changeDetectorRef.markForCheck();

                this._chatNotificationService.showSuccess('Autocompletado', `Datos de ${detalle.proveedor} cargados`, 3000);
            },
            error: () => {
                this._chatNotificationService.showError('Error', 'No se pudo obtener el detalle de la factura', 5000);
            }
        });
    }
}
