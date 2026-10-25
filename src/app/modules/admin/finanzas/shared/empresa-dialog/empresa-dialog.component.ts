import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FinanzasService } from '../../finanzas.service';
import { Empresa } from '../../finanzas.types';
import { mensajeDeError } from '../../finanzas.utils';

/** Alta de una razón social propia; al guardar se cierra devolviendo la empresa creada. */
@Component({
    selector: 'app-finanzas-empresa-dialog',
    standalone: true,
    templateUrl: './empresa-dialog.component.html',
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmpresaDialogComponent {
    private readonly _service = inject(FinanzasService);
    private readonly _dialogRef = inject<MatDialogRef<EmpresaDialogComponent, Empresa>>(MatDialogRef);
    private readonly _destroyRef = inject(DestroyRef);

    readonly form = inject(FormBuilder).nonNullable.group({
        rfc: ['', [Validators.required, Validators.pattern(/^[A-Za-zÑñ&\d]{12,13}$/)]],
        nombre: ['', [Validators.required, Validators.maxLength(200)]]
    });
    readonly guardando = signal(false);
    readonly error = signal<string | null>(null);

    guardar(): void {
        if (this.form.invalid || this.guardando()) return;
        const { rfc, nombre } = this.form.getRawValue();
        this.guardando.set(true);
        // Esc, fondo y «Cancelar» no cierran con el POST en vuelo: la empresa quedaría creada sin llegar a la pantalla.
        this._dialogRef.disableClose = true;
        this.error.set(null);
        this._service
            .crearEmpresa({ rfc: rfc.trim().toUpperCase(), nombre: nombre.trim() })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (empresa) => this._dialogRef.close(empresa),
                error: (e) => {
                    this.guardando.set(false);
                    this._dialogRef.disableClose = false;
                    this.error.set(mensajeDeError(e));
                }
            });
    }
}
