import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FinanzasService } from '../../finanzas.service';
import { Cuenta, Empresa } from '../../finanzas.types';
import { mensajeDeError } from '../../finanzas.utils';

/** La terminación son los últimos 4 o 5 dígitos: jamás el número de cuenta ni la CLABE. (`\d` de JS solo cubre 0-9.) */
export const terminacionValida = (valor: string): boolean => /^\d{4,5}$/.test(valor.trim());

const validarTerminacion = (c: AbstractControl): ValidationErrors | null => (terminacionValida(String(c.value ?? '')) ? null : { terminacion: true });

/** Alta de una cuenta bancaria; al guardar se cierra devolviendo la cuenta creada. */
@Component({
    selector: 'app-finanzas-cuenta-dialog',
    standalone: true,
    templateUrl: './cuenta-dialog.component.html',
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CuentaDialogComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _dialogRef = inject<MatDialogRef<CuentaDialogComponent, Cuenta>>(MatDialogRef);
    private readonly _destroyRef = inject(DestroyRef);

    readonly tipos = [
        { valor: 'Cheques', texto: 'Cheques' },
        { valor: 'Ahorro', texto: 'Ahorro' },
        { valor: 'TarjetaCredito', texto: 'Tarjeta de crédito' }
    ];
    readonly monedas = ['MXN', 'USD'];

    readonly form = inject(FormBuilder).nonNullable.group({
        empresaId: [null as number | null, Validators.required],
        alias: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
        tipo: ['Cheques', Validators.required],
        moneda: ['MXN', Validators.required],
        terminacion: ['', validarTerminacion]
    });
    readonly empresas = signal<Empresa[] | null>(null);
    readonly errorEmpresas = signal<string | null>(null);
    readonly guardando = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this._service
            .empresas()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (empresas) => this.empresas.set(empresas),
                error: (e) => this.errorEmpresas.set(mensajeDeError(e))
            });
    }

    guardar(): void {
        const { empresaId, alias, tipo, moneda, terminacion } = this.form.getRawValue();
        if (this.form.invalid || this.guardando() || empresaId === null) return;
        this.guardando.set(true);
        this._dialogRef.disableClose = true;
        this.error.set(null);
        this._service
            .crearCuenta({ empresaId, alias: alias.trim(), tipo, moneda, terminacion: terminacion.trim() })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (cuenta) => this._dialogRef.close(cuenta),
                error: (e) => {
                    this.guardando.set(false);
                    this._dialogRef.disableClose = false;
                    this.error.set(mensajeDeError(e));
                }
            });
    }
}
