import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
        this.error.set(null);
        this._service.crearEmpresa({ rfc: rfc.trim().toUpperCase(), nombre: nombre.trim() }).subscribe({
            next: (empresa) => this._dialogRef.close(empresa),
            error: (e) => {
                this.guardando.set(false);
                this.error.set(mensajeDeError(e));
            }
        });
    }
}
