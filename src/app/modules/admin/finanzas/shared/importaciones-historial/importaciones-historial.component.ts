import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subscription } from 'rxjs';
import { FinanzasService } from '../../finanzas.service';
import { Importacion, Pagina } from '../../finanzas.types';
import { fechaUtc, mensajeDeError } from '../../finanzas.utils';
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
    /** Se emite tras anular, para que quien muestra las filas importadas (CFDI, movimientos) las vuelva a pedir. */
    @Output() anulada = new EventEmitter<void>();

    readonly datos = signal<Pagina<Importacion> | null>(null);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly anulando = signal<number | null>(null);
    readonly fechaUtc = fechaUtc;

    ngOnChanges(): void {
        this.recargar();
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
        this._confirmacion
            .open({
                title: 'Anular importación',
                message: `Se borrarán las filas nuevas que creó la importación de «${i.nombreArchivo}». Lo que ya existía antes no se toca. ¿Anularla?`,
                actions: { confirm: { label: 'Anular' } }
            })
            .afterClosed()
            .subscribe((resultado) => {
                if (resultado !== 'confirmed') return;
                this.anulando.set(i.importacionId);
                this._service.anularImportacion(i.importacionId).subscribe({
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
            });
    }
}
