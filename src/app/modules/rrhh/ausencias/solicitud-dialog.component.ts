import { MAT_DATE_FORMATS } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { aFechaIso, mensajeError, textoONull } from '../colaboradores/colaboradores.utils';
import { AusenciasService } from './ausencias.service';
import { Previsualizacion, SaldoVacaciones, TipoAusencia } from './ausencias.types';

import { FORMATOS_FECHA_CORTA } from './ausencias.formats';

@Component({
    selector: 'rrhh-solicitud-dialog',
    standalone: true,
    providers: [{ provide: MAT_DATE_FORMATS, useValue: FORMATOS_FECHA_CORTA }],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatIconModule
    ],
    templateUrl: './solicitud-dialog.component.html'
})
export class SolicitudDialogComponent implements OnInit {
    readonly data = inject<{ tipos: TipoAusencia[]; saldo: SaldoVacaciones }>(MAT_DIALOG_DATA);
    private readonly _ref = inject<MatDialogRef<SolicitudDialogComponent, boolean>>(MatDialogRef);
    private readonly _service = inject(AusenciasService);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _destroyRef = inject(DestroyRef);

    readonly hoy = DateTime.local().startOf('day');
    readonly guardando = signal(false);
    readonly calculando = signal(false);
    readonly preview = signal<Previsualizacion | null>(null);

    readonly form = new FormGroup({
        tipoAusenciaId: new FormControl<number>(this.data.tipos[0]?.tipoAusenciaId ?? 0, {
            nonNullable: true,
            validators: [Validators.required, Validators.min(1)]
        }),
        fechaInicio: new FormControl<DateTime | null>(null, [Validators.required]),
        fechaFin: new FormControl<DateTime | null>(null, [Validators.required]),
        motivo: new FormControl<string>('', { nonNullable: true })
    });

    get tipoSeleccionado(): TipoAusencia | undefined {
        const id = this.form.controls.tipoAusenciaId.value;
        return this.data.tipos.find((t) => t.tipoAusenciaId === id);
    }

    get esVacaciones(): boolean {
        return this.tipoSeleccionado?.codigo === 'VACACIONES';
    }

    ngOnInit(): void {
        this.actualizarValidacionMotivo();

        this.form.controls.tipoAusenciaId.valueChanges
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe(() => {
                this.actualizarValidacionMotivo();
            });

        this.form.controls.fechaInicio.valueChanges
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((inicio) => {
                if (inicio?.isValid && !this.form.controls.fechaFin.value) {
                    this.form.controls.fechaFin.setValue(inicio);
                }
            });

        // solo cuando cambian el tipo o las fechas (no con cada letra del comentario)
        this.form.valueChanges
            .pipe(
                map(() => `${this.form.controls.tipoAusenciaId.value}|${this.form.controls.fechaInicio.value?.toISODate()}|${this.form.controls.fechaFin.value?.toISODate()}`),
                distinctUntilChanged(),
                debounceTime(300),
                switchMap(() => {
                    const tipoId = this.form.controls.tipoAusenciaId.value;
                    const ini = this.form.controls.fechaInicio.value;
                    const fin = this.form.controls.fechaFin.value;

                    if (!tipoId || !ini?.isValid || !fin?.isValid) {
                        this.preview.set(null);
                        return of(null);
                    }

                    const iniIso = aFechaIso(ini);
                    const finIso = aFechaIso(fin);
                    if (!iniIso || !finIso) {
                        this.preview.set(null);
                        return of(null);
                    }

                    this.calculando.set(true);
                    return this._service.previsualizar(tipoId, iniIso, finIso).pipe(
                        switchMap((res) => {
                            this.calculando.set(false);
                            this.preview.set(res);
                            return of(null);
                        }),
                        // el error se atrapa aquí dentro: si se propagara, el cálculo en vivo dejaría de funcionar
                        catchError((e) => {
                            this.calculando.set(false);
                            this.preview.set({ diasHabiles: 0, disponible: 0, quedarian: 0, error: mensajeError(e, 'No se pudo calcular los días hábiles.') });
                            return of(null);
                        })
                    );
                }),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe({
                error: (e) => {
                    this.calculando.set(false);
                    this.preview.set({
                        diasHabiles: 0,
                        disponible: 0,
                        quedarian: 0,
                        error: mensajeError(e, 'No se pudo calcular los días hábiles.')
                    });
                }
            });
    }

    seleccionarTipo(tipoId: number): void {
        this.form.controls.tipoAusenciaId.setValue(tipoId);
    }

    private actualizarValidacionMotivo(): void {
        const req = !!this.tipoSeleccionado?.requiereMotivo;
        const motivoControl = this.form.controls.motivo;
        if (req) {
            motivoControl.setValidators([Validators.required, Validators.pattern(/\S/)]);
        } else {
            motivoControl.clearValidators();
        }
        motivoControl.updateValueAndValidity();
    }

    get puedeEnviar(): boolean {
        if (this.form.invalid || this.guardando() || this.calculando()) return false;
        const p = this.preview();
        if (!p || p.error || p.diasHabiles <= 0) return false;
        return true;
    }

    enviar(): void {
        if (!this.puedeEnviar) return;

        const val = this.form.getRawValue();
        const fechaInicio = aFechaIso(val.fechaInicio);
        const fechaFin = aFechaIso(val.fechaFin);

        if (!fechaInicio || !fechaFin) return;

        this.guardando.set(true);
        this._service
            .solicitar({
                tipoAusenciaId: val.tipoAusenciaId,
                fechaInicio,
                fechaFin,
                motivo: textoONull(val.motivo)
            })
            .subscribe({
                next: () => {
                    this.guardando.set(false);
                    this._snackBar.open('Solicitud enviada.', 'Cerrar', { duration: 5000 });
                    this._ref.close(true);
                },
                error: (e) => {
                    this.guardando.set(false);
                    this._snackBar.open(mensajeError(e, 'No se pudo enviar la solicitud.'), 'Cerrar', { duration: 5000 });
                }
            });
    }
}
