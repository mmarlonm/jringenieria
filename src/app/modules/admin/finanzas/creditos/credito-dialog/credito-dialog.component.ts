import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FinanzasService } from '../../finanzas.service';
import { Credito, CreditoGuardar, Cuenta, Empresa, EstadoCredito, SentidoCredito, TipoCredito } from '../../finanzas.types';
import { fraccionAPorcentaje, mensajeDeError, porcentajeAFraccion } from '../../finanzas.utils';

export interface CreditoDialogData {
    credito?: Credito;
}

@Component({
    selector: 'app-finanzas-credito-dialog',
    standalone: true,
    templateUrl: './credito-dialog.component.html',
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreditoDialogComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _dialogRef = inject<MatDialogRef<CreditoDialogComponent, Credito>>(MatDialogRef);
    private readonly _destroyRef = inject(DestroyRef);
    readonly data = inject<CreditoDialogData>(MAT_DIALOG_DATA, { optional: true });

    readonly sentidos: readonly SentidoCredito[] = ['Recibido', 'Otorgado'];
    readonly tipos: readonly { valor: TipoCredito; texto: string }[] = [
        { valor: 'Simple', texto: 'Crédito simple' },
        { valor: 'Arrendamiento', texto: 'Arrendamiento' },
        { valor: 'Mercancia', texto: 'Línea de proveedor (mercancía)' },
        { valor: 'Otro', texto: 'Otro' }
    ];
    readonly monedas: readonly string[] = ['MXN', 'USD'];
    readonly estados: readonly EstadoCredito[] = ['Activo', 'Liquidado'];

    readonly esEdicion = Boolean(this.data?.credito);

    readonly form = inject(FormBuilder).group({
        empresaId: [this.data?.credito?.empresaId ?? (null as number | null), Validators.required],
        sentido: [this.data?.credito?.sentido ?? ('Recibido' as SentidoCredito), Validators.required],
        tipo: [this.data?.credito?.tipo ?? ('Simple' as TipoCredito), Validators.required],
        contraparte: [this.data?.credito?.contraparte ?? '', [Validators.required, Validators.maxLength(200)]],
        moneda: [this.data?.credito?.moneda ?? 'MXN', Validators.required],
        montoOriginal: [this.data?.credito?.montoOriginal ?? (null as number | null), [Validators.required, Validators.min(0.01)]],
        saldoCapital: [this.data?.credito?.saldoCapital ?? (null as number | null), [Validators.required, Validators.min(0)]],
        tasaAnual: [
            this.data?.credito ? fraccionAPorcentaje(this.data.credito.tasaAnual) : (null as number | null),
            [Validators.required, Validators.min(0), Validators.max(100)]
        ],
        vencimientoFinal: [this.data?.credito?.vencimientoFinal ? this.data.credito.vencimientoFinal.slice(0, 10) : ''],
        cuentaId: [this.data?.credito?.cuentaId ?? (null as number | null)],
        estado: [this.data?.credito?.estado ?? ('Activo' as EstadoCredito), Validators.required],
        notas: [this.data?.credito?.notas ?? '', Validators.maxLength(500)]
    });

    readonly empresas = signal<Empresa[]>([]);
    readonly cuentas = signal<Cuenta[]>([]);
    readonly guardando = signal(false);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        this._service
            .empresas()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (empresas) => this.empresas.set(empresas),
                error: (e) => this.error.set(mensajeDeError(e))
            });

        if (this.esEdicion && this.data?.credito) {
            this.form.controls.empresaId.disable();
            this._cargarCuentas(this.data.credito.empresaId);
        }

        this.form.controls.empresaId.valueChanges
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((empId) => {
                if (empId) {
                    this._cargarCuentas(empId);
                } else {
                    this.cuentas.set([]);
                    this.form.controls.cuentaId.setValue(null);
                }
            });
    }

    private _cargarCuentas(empresaId: number): void {
        this._service
            .cuentas(empresaId)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (cuentas) => {
                    this.cuentas.set(cuentas);
                    const cuentaActual = this.form.controls.cuentaId.value;
                    if (cuentaActual && !cuentas.some((c) => c.cuentaId === cuentaActual)) {
                        this.form.controls.cuentaId.setValue(null);
                    }
                },
                error: (e) => this.error.set(mensajeDeError(e))
            });
    }

    guardar(): void {
        if (this.form.invalid || this.guardando()) {
            return;
        }

        const raw = this.form.getRawValue();
        const contraparte = (raw.contraparte ?? '').trim();
        if (!contraparte) {
            return;
        }

        this.guardando.set(true);
        this.error.set(null);
        this._dialogRef.disableClose = true;

        const dto: CreditoGuardar = {
            empresaId: raw.empresaId!,
            sentido: raw.sentido!,
            tipo: raw.tipo!,
            contraparte,
            moneda: raw.moneda!,
            montoOriginal: Number(raw.montoOriginal),
            saldoCapital: Number(raw.saldoCapital),
            tasaAnual: porcentajeAFraccion(Number(raw.tasaAnual)), // porcentaje a fracción (a 6 decimales, como la guarda el API)
            vencimientoFinal: raw.vencimientoFinal && raw.vencimientoFinal.trim() !== '' ? raw.vencimientoFinal : null,
            cuentaId: raw.cuentaId ?? null,
            estado: raw.estado!,
            notas: raw.notas && raw.notas.trim() !== '' ? raw.notas.trim() : null
        };

        const llamada = this.esEdicion && this.data?.credito
            ? this._service.actualizarCredito(this.data.credito.creditoId, dto)
            : this._service.crearCredito(dto);

        llamada.pipe(takeUntilDestroyed(this._destroyRef)).subscribe({
            next: (credito) => {
                this._dialogRef.close(credito);
            },
            error: (e) => {
                this.guardando.set(false);
                this._dialogRef.disableClose = false;
                this.error.set(mensajeDeError(e));
            }
        });
    }
}

