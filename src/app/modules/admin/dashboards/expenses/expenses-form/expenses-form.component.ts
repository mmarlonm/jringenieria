import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExpensesService } from '../expenses.service';
import { Expense, ExpenseCatalogs } from '../models/expenses.types';
import Swal from 'sweetalert2';

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
        MatTooltipModule
    ]
})
export class ExpenseFormComponent implements OnInit {
    expenseForm: FormGroup;
    catalogs: ExpenseCatalogs;
    isEdit: boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { expense: Expense | null },
        // 🔹 Cambia 'private _dialogRef' por 'public dialogRef'
        public dialogRef: MatDialogRef<ExpenseFormComponent>,
        private _fb: FormBuilder,
        private _expensesService: ExpensesService,
        private _changeDetectorRef: ChangeDetectorRef
    ) {
        this.isEdit = !!data.expense;
    }

    ngOnInit(): void {
        // Suscribirse a los catálogos con protección de nulos
        this._expensesService.catalogs$.subscribe(cat => {
            if (cat) {
                this.catalogs = cat;
                this._changeDetectorRef.markForCheck();
            }
        });

        // Inicializar formulario
        this.expenseForm = this._fb.group({
            gastoId: [0],
            fecha: [new Date(), Validators.required],
            nombreGasto: ['', [Validators.required, Validators.maxLength(255)]],
            cantidad: [0, [Validators.required, Validators.min(0.01)]],
            tasaId: [null, Validators.required],
            impuestos: [{ value: 0, disabled: true }],
            tipoId: [null, Validators.required],
            conceptoId: [null, Validators.required],
            subtipoId: [null, Validators.required],
            areaId: [null, Validators.required],
            proveedorId: [null, Validators.required],
            formaPagoId: [null, Validators.required],
            cuentaId: [null, Validators.required],
            factura: [''],
            descripcion: ['']
        });

        if (this.isEdit && this.data.expense) {
            this.expenseForm.patchValue(this.data.expense);
        }

        // Suscripción a cambios para impuestos
        this.expenseForm.get('cantidad').valueChanges.subscribe(() => this._calculateTax());
        this.expenseForm.get('tasaId').valueChanges.subscribe(() => this._calculateTax());
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

        // 🔹 Recuperar sesión (Ajustado a la estructura común de Fuse/Angular)
        try {
            const userSessionStr = localStorage.getItem('user');
            if (userSessionStr) {
                const session = JSON.parse(userSessionStr);
                expenseData.usuarioId = session.id || session.usuarioId;
                expenseData.unidadId = session.unidadId;
            }
        } catch (e) {
            console.error('Error en sesión', e);
        }

        const request = this.isEdit
            ? this._expensesService.updateExpense(expenseData.gastoId, expenseData)
            : this._expensesService.createExpense(expenseData);

        request.subscribe({
            next: () => {
                Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
                this.dialogRef.close('saved');
            },
            error: () => Swal.fire('Error', 'No se pudo procesar el registro', 'error')
        });
    }
}