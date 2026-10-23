import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ColaboradoresService } from '../colaboradores.service';
import { GeocercaSucursal } from '../colaboradores.types';
import { mensajeError } from '../colaboradores.utils';

/**
 * Punto de referencia y radio de la geocerca de cada sucursal. Es informativo: el checador registra si el marcaje
 * cae dentro, sin bloquearlo. Una sucursal sin coordenadas no se revisa.
 */
@Component({
    selector: 'rrhh-geocerca-sucursales-dialog',
    standalone: true,
    templateUrl: './geocerca-sucursales-dialog.component.html',
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule]
})
export class GeocercaSucursalesDialogComponent {
    private readonly _service = inject(ColaboradoresService);
    private readonly _fb = inject(FormBuilder);
    private readonly _dialogRef = inject<MatDialogRef<GeocercaSucursalesDialogComponent, boolean>>(MatDialogRef);
    private readonly _snackBar = inject(MatSnackBar);

    readonly sucursales = inject<GeocercaSucursal[]>(MAT_DIALOG_DATA);
    readonly form = this._fb.group(
        Object.fromEntries(this.sucursales.map((s) => [
            s.sucursalId,
            this._fb.nonNullable.group({
                latitud: [s.latitud as number | null],
                longitud: [s.longitud as number | null],
                radioMetros: [s.radioMetros as number | null]
            })
        ]))
    );
    guardando = false;
    private _guardadas = false;

    /** Guarda una sucursal; el diálogo sigue abierto para poder seguir con las demás. */
    guardar(sucursal: GeocercaSucursal): void {
        const v = this.form.controls[sucursal.sucursalId].getRawValue();
        this.guardando = true;
        this._service.guardarGeocercaSucursal(sucursal.sucursalId, { latitud: v.latitud, longitud: v.longitud, radioMetros: v.radioMetros }).subscribe({
            next: () => {
                this.guardando = false;
                this._guardadas = true;
                this._snackBar.open(`Geocerca de ${sucursal.nombre} guardada.`, 'Cerrar', { duration: 4000 });
            },
            error: (error) => {
                this.guardando = false;
                this._snackBar.open(mensajeError(error, 'No se pudo guardar la geocerca.'), 'Cerrar', { duration: 6000 });
            }
        });
    }

    cerrar(): void {
        this._dialogRef.close(this._guardadas);
    }
}
