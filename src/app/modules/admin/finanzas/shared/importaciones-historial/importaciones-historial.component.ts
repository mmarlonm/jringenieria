import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subscription } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { FinanzasService } from '../../finanzas.service';
import { Cuenta, Importacion, Pagina } from '../../finanzas.types';
import { etiquetaCuenta, fechaUtc, mensajeDeError } from '../../finanzas.utils';
import { PaginadorComponent } from '../paginador/paginador.component';

const TAMANO = 10;

/** Historial de importaciones de una fuente (y de una empresa, o de todas si `empresaId` es null), con «Anular» por fila. */
@Component({
    selector: 'app-finanzas-importaciones-historial',
    standalone: true,
    templateUrl: './importaciones-historial.component.html',
    imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, PaginadorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportacionesHistorialComponent implements OnChanges {
    private readonly _service = inject(FinanzasService);
    private readonly _confirmacion = inject(FuseConfirmationService);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _destroyRef = inject(DestroyRef);
    private _sub?: Subscription;

    @Input() fuente: 'OneFacturaExcel' | 'BbvaExcel' = 'OneFacturaExcel';
    @Input() empresaId: number | null = null;
    /** Solo para `BbvaExcel`: con ellas la columna «Cuenta» dice a cuál cuenta fue cada importación. */
    @Input() cuentas: Cuenta[] = [];
    @Input() nombresEmpresa: ReadonlyMap<number, string> = new Map();
    /** Se emite tras anular, para que quien muestra las filas importadas (CFDI, movimientos) las vuelva a pedir. */
    @Output() anulada = new EventEmitter<void>();

    readonly datos = signal<Pagina<Importacion> | null>(null);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly anulando = signal<number | null>(null);
    readonly fechaUtc = fechaUtc;

    /** Solo lo que cambia lo pedido recarga; las cuentas y los nombres únicamente rotulan. */
    ngOnChanges(cambios: SimpleChanges): void {
        if (cambios['fuente'] || cambios['empresaId']) this.recargar();
    }

    /** «Empresa · alias ····NNNN · moneda» de la cuenta de una importación, o «—» si no tiene o no se conoce. */
    etiquetaDeCuenta(cuentaId: number | null): string {
        const cuenta = this.cuentas.find((c) => c.cuentaId === cuentaId);
        return cuenta ? etiquetaCuenta(cuenta, this.nombresEmpresa) : '—';
    }

    /** Vuelve a la primera página (donde aparece una importación recién hecha); la llama quien importa. */
    recargar(): void {
        this.cargar(1);
    }

    cargar(pagina: number): void {
        this._sub?.unsubscribe();
        this.cargando.set(true);
        this.error.set(null);
        this._sub = this._service
            .importaciones({ empresaId: this.empresaId, fuente: this.fuente, pagina, tamano: TAMANO })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (datos) => {
                    this.cargando.set(false);
                    this.datos.set(datos);
                },
                error: (e) => {
                    this.cargando.set(false);
                    this.error.set(mensajeDeError(e));
                }
            });
    }

    anular(i: Importacion): void {
        if (this.anulando() !== null) return;
        const id = i.importacionId;
        this._confirmacion
            .open({
                title: 'Anular importación',
                // Texto fijo: Fuse pinta `message` con [innerHTML], así que no se le interpola nada guardado (p. ej. el nombre del archivo).
                message:
                    '¿Anular esta importación? Se borrarán los registros que creó; los CFDI que una importación posterior marcó como Cancelado no se revierten.',
                actions: { confirm: { label: 'Anular' } }
            })
            .afterClosed()
            .pipe(
                filter((resultado) => resultado === 'confirmed'),
                tap(() => this.anulando.set(id)),
                switchMap(() => this._service.anularImportacion(id)),
                // Si la página se cierra con la anulación en vuelo, se cancela la petición y no se toca un componente destruido.
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe({
                next: () => {
                    this.anulando.set(null);
                    this._snackBar.open('Importación anulada.', 'Cerrar', { duration: 5000 });
                    this.anulada.emit();
                    this.recargar();
                },
                error: (e) => {
                    this.anulando.set(null);
                    this._snackBar.open(mensajeDeError(e), 'Cerrar', { duration: 7000 });
                }
            });
    }
}
