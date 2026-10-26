import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import '../../finanzas.locale';
import { CfdiCandidato, MovimientoConciliacion, Vinculo } from '../../finanzas.types';
import { FinanzasService } from '../../finanzas.service';
import { mensajeDeError, referenciaCfdi } from '../../finanzas.utils';

export interface ManualDialogData {
    movimiento: MovimientoConciliacion;
    moneda: string;
}

@Component({
    selector: 'app-finanzas-manual-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatRadioModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './manual-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualDialogComponent implements OnInit {
    readonly data: ManualDialogData = inject(MAT_DIALOG_DATA);
    private readonly _dialogRef: MatDialogRef<ManualDialogComponent, Vinculo> = inject(MatDialogRef);
    private readonly _service = inject(FinanzasService);
    private readonly _destroyRef = inject(DestroyRef);

    readonly q = signal('');
    readonly candidatos = signal<CfdiCandidato[] | null>(null);
    readonly cargando = signal(false);
    readonly errorCandidatos = signal<string | null>(null);
    readonly candidatoSeleccionado = signal<CfdiCandidato | null>(null);
    readonly importe = signal<number>(0);
    readonly guardando = signal(false);
    readonly error = signal<string | null>(null);

    private _subCandidatos?: Subscription;

    readonly refCfdi = referenciaCfdi;

    ngOnInit(): void {
        this.buscar('');
    }

    buscar(termino?: string): void {
        if (termino !== undefined) {
            this.q.set(termino);
        }
        const texto = this.q().trim();
        this._subCandidatos?.unsubscribe();
        this.cargando.set(true);
        this.errorCandidatos.set(null);

        this._subCandidatos = this._service
            .candidatosCfdi(this.data.movimiento.movimientoId, texto)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (lista) => {
                    this.candidatos.set(lista);
                    this.cargando.set(false);
                },
                error: (e) => {
                    this.errorCandidatos.set(mensajeDeError(e));
                    this.cargando.set(false);
                }
            });
    }

    elegirCandidato(c: CfdiCandidato): void {
        this.candidatoSeleccionado.set(c);
        const pendiente = this.data.movimiento.pendiente;
        const menor = Math.min(pendiente, c.saldo);
        const centavos = Math.round(menor * 100);
        this.importe.set(centavos / 100);
    }

    maximo(): number {
        const c = this.candidatoSeleccionado();
        if (!c) return 0;
        return Math.min(this.data.movimiento.pendiente, c.saldo);
    }

    esValido(): boolean {
        const c = this.candidatoSeleccionado();
        if (!c) return false;
        const impCentavos = Math.round(this.importe() * 100);
        if (impCentavos <= 0) return false;
        const maxCentavos = Math.round(Math.min(this.data.movimiento.pendiente, c.saldo) * 100);
        return impCentavos <= maxCentavos + 1;
    }

    aplicar(): void {
        if (!this.esValido() || this.guardando()) return;
        const c = this.candidatoSeleccionado()!;
        this.guardando.set(true);
        this._dialogRef.disableClose = true;
        this.error.set(null);

        this._service
            .conciliarManual({
                movimientoId: this.data.movimiento.movimientoId,
                cfdiId: c.cfdiId,
                importeAplicado: this.importe()
            })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (vinculo) => {
                    this._dialogRef.close(vinculo);
                },
                error: (e) => {
                    this.guardando.set(false);
                    this._dialogRef.disableClose = false;
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    cancelar(): void {
        this._dialogRef.close();
    }
}
