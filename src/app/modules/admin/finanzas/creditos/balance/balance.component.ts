import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { FinanzasService } from '../../finanzas.service';
import { BalanceCreditos } from '../../finanzas.types';
import { formatearMonto, mensajeDeError } from '../../finanzas.utils';

@Component({
    selector: 'app-finanzas-balance-creditos',
    standalone: true,
    templateUrl: './balance.component.html',
    imports: [
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalanceCreditosComponent implements OnInit, OnChanges {
    private readonly _service = inject(FinanzasService);
    private readonly _destroyRef = inject(DestroyRef);
    private _subBalance?: Subscription;

    @Input() empresaId: number | null = null;

    readonly balance = signal<BalanceCreditos | null>(null);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);

    readonly formatearMonto = formatearMonto;

    private _iniciadoPorChanges = false;

    formatearRelacion(r: number | null | undefined): string {
        if (r === null || r === undefined) {
            return '—';
        }
        return `${(r * 100).toFixed(2)} %`;
    }

    ngOnInit(): void {
        if (!this._iniciadoPorChanges) {
            this.cargar();
        }
    }

    ngOnChanges(cambios: SimpleChanges): void {
        if (cambios['empresaId']) {
            this._iniciadoPorChanges = true;
            this.cargar();
        }
    }

    cargar(): void {
        this._subBalance?.unsubscribe();
        this.cargando.set(true);
        this.error.set(null);

        this._subBalance = this._service
            .balanceCreditos(this.empresaId ?? undefined)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (b) => {
                    this.cargando.set(false);
                    this.balance.set(b);
                },
                error: (e) => {
                    this.cargando.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }
}

