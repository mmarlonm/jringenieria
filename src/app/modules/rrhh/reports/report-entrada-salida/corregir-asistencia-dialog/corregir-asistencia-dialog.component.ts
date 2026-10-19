import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { mensajeError } from '../../../colaboradores/colaboradores.utils';
import { AsistenciaReporteDto, PersonalManagementService } from '../../../personal-management/personal-management.service';

/** El API manda "09:00:00"; el campo de hora trabaja con HH:mm. */
const hhmm = (valor?: string | null): string => (valor ? valor.substring(0, 5) : '');

/**
 * Lo que se manda al API: vacío → null. Si la hora no se tocó se manda tal cual llegó (con sus segundos),
 * para que la bitácora no registre un cambio de «09:03:27» a «09:03:00» que nadie hizo.
 */
const aHora = (valor: string, original?: string | null): string | null =>
    valor === '' ? null : valor === hhmm(original) ? original! : `${valor}:00`;

/**
 * RRHH corrige las marcas de un registro. El registro llega como `data` (el diálogo no hace peticiones al abrirse:
 * la barra de carga de Fuse lanzaba NG0100 en modo desarrollo). Devuelve `true` si se guardó.
 */
@Component({
    selector: 'rrhh-corregir-asistencia-dialog',
    standalone: true,
    templateUrl: './corregir-asistencia-dialog.component.html',
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule]
})
export class CorregirAsistenciaDialogComponent {
    private readonly _service = inject(PersonalManagementService);
    private readonly _dialogRef = inject<MatDialogRef<CorregirAsistenciaDialogComponent, boolean>>(MatDialogRef);
    private readonly _snackBar = inject(MatSnackBar);

    readonly asistencia = inject<AsistenciaReporteDto>(MAT_DIALOG_DATA);

    readonly form = inject(FormBuilder).nonNullable.group({
        horaEntrada: [hhmm(this.asistencia.horaEntrada), Validators.required],
        horaSalida: [hhmm(this.asistencia.horaSalida)],
        comidaInicio: [hhmm(this.asistencia.comidaInicio)],
        comidaFin: [hhmm(this.asistencia.comidaFin)],
        tipoJornada: [this.asistencia.tipoJornada ?? 'DIURNA'],
        observaciones: [this.asistencia.observaciones ?? '', Validators.maxLength(500)]
    });
    guardando = false;

    guardar(): void {
        if (this.form.invalid || this.guardando) return;
        const v = this.form.getRawValue();
        const a = this.asistencia;
        this.guardando = true;
        this._service.corregirAsistencia(a.asistenciaId, {
            horaEntrada: aHora(v.horaEntrada, a.horaEntrada)!,
            horaSalida: aHora(v.horaSalida, a.horaSalida),
            comidaInicio: aHora(v.comidaInicio, a.comidaInicio),
            comidaFin: aHora(v.comidaFin, a.comidaFin),
            tipoJornada: v.tipoJornada,
            observaciones: v.observaciones.trim() || null
        }).subscribe({
            next: (r) => {
                this._snackBar.open(r?.mensaje || 'Asistencia corregida.', 'Cerrar', { duration: 5000 });
                this._dialogRef.close(true);
            },
            error: (e) => {
                this.guardando = false;
                this._snackBar.open(mensajeError(e, 'No se pudo corregir la asistencia.'), 'Cerrar', { duration: 5000 });
            }
        });
    }
}
