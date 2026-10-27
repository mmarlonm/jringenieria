import '../finanzas.locale'; // registra 'es-MX' (importes y saldos)
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subscription } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { FinanzasService } from '../finanzas.service';
import { Cuenta, Empresa, HojaInfo, Movimiento, Pagina, ResultadoImportacion } from '../finanzas.types';
import { etiquetaCuenta, mensajeDeError, motivoArchivoInvalido } from '../finanzas.utils';
import { CuentaDialogComponent } from '../shared/cuenta-dialog/cuenta-dialog.component';
import { EmpresaDialogComponent } from '../shared/empresa-dialog/empresa-dialog.component';
import { ImportacionesHistorialComponent } from '../shared/importaciones-historial/importaciones-historial.component';
import { PaginadorComponent } from '../shared/paginador/paginador.component';
import { ResultadoImportacionComponent } from '../shared/resultado-importacion/resultado-importacion.component';

const TAMANO_PAGINA = 50;

const ETIQUETA_FORMATO: Record<HojaInfo['formatoDetectado'], string> = {
    CFDI: 'CFDI',
    BancoA: 'Movimientos bancarios (formato A)',
    BancoB: 'Movimientos bancarios (formato B)',
    Desconocido: 'Formato no reconocido'
};

@Component({
    selector: 'app-finanzas-bancos',
    standalone: true,
    templateUrl: './bancos.component.html',
    imports: [
        CurrencyPipe,
        DatePipe,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        ImportacionesHistorialComponent,
        PaginadorComponent,
        ResultadoImportacionComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BancosComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _confirmacion = inject(FuseConfirmationService);
    private readonly _snackBar = inject(MatSnackBar);
    private readonly _destroyRef = inject(DestroyRef);
    private _subLista?: Subscription;
    private _subHojas?: Subscription;

    @ViewChild(ImportacionesHistorialComponent) historial?: ImportacionesHistorialComponent;

    readonly etiquetaFormato = (f: HojaInfo['formatoDetectado']): string => ETIQUETA_FORMATO[f];
    /** «Empresa · alias ····NNNN · moneda»: dice de qué empresa es la cuenta, que es lo que evita mezclarlas al importar. */
    readonly etiquetaCuenta = (c: Cuenta): string => etiquetaCuenta(c, this.nombresEmpresa());

    // Cuenta
    readonly empresas = signal<Empresa[]>([]);
    readonly nombresEmpresa = computed(() => new Map(this.empresas().map((e) => [e.empresaId, e.nombre] as const)));
    readonly cuentas = signal<Cuenta[]>([]);
    readonly cargandoCuentas = signal(false);
    readonly errorCuentas = signal<string | null>(null);
    readonly cuentaId = signal<number | null>(null);
    readonly cuenta = computed(() => this.cuentas().find((c) => c.cuentaId === this.cuentaId()) ?? null);

    // Archivo, hojas e importación
    readonly archivo = signal<File | null>(null);
    readonly hojas = signal<HojaInfo[]>([]);
    readonly hoja = signal<string | null>(null);
    readonly cargandoHojas = signal(false);
    /** Una validación o una importación en curso: bloquea los dos botones y los selectores. */
    readonly procesando = signal(false);
    readonly errorImportacion = signal<string | null>(null);
    /**
     * Resultado de «Validar» (nada guardado). Solo vale para la cuenta, el archivo y la hoja con que se pidió:
     * cambiar cualquiera de los tres lo borra (`invalidar`), y sin él «Confirmar importación» no se habilita.
     */
    readonly vistaPrevia = signal<ResultadoImportacion | null>(null);
    /** Lo que dejó la última importación real. */
    readonly resultado = signal<ResultadoImportacion | null>(null);
    /** Con varias hojas hay que elegir una; con una sola el API usa la primera con encabezado reconocible. */
    readonly puedeValidar = computed(
        () =>
            this.cuentaId() !== null &&
            this.archivo() !== null &&
            !this.cargandoHojas() &&
            !this.procesando() &&
            (this.hojas().length <= 1 || this.hoja() !== null)
    );
    readonly puedeConfirmar = computed(() => this.vistaPrevia() !== null && !this.procesando());

    // Movimientos (los filtros se enlazan con ngModel; el resultado vive en señales)
    desde = '';
    hasta = '';
    q = '';
    readonly lista = signal<Pagina<Movimiento> | null>(null);
    readonly cargandoLista = signal(false);
    readonly errorLista = signal<string | null>(null);

    ngOnInit(): void {
        this.cargarCuentas();
        this.cargarEmpresas();
    }

    get fechasInvalidas(): boolean {
        return Boolean(this.desde && this.hasta && this.desde > this.hasta);
    }

    get hayFiltros(): boolean {
        return Boolean(this.desde || this.hasta || this.q.trim());
    }

    /** Solo da el nombre de la empresa a las etiquetas de cuenta: si falla, las cuentas salen sin empresa y la página sigue sirviendo. */
    private cargarEmpresas(): void {
        this._service
            .empresas()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({ next: (empresas) => this.empresas.set(empresas), error: () => this.empresas.set([]) });
    }

    cargarCuentas(): void {
        this.cargandoCuentas.set(true);
        this.errorCuentas.set(null);
        this._service
            .cuentas()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (cuentas) => {
                    this.cargandoCuentas.set(false);
                    this.cuentas.set(cuentas);
                },
                error: (e) => {
                    this.cargandoCuentas.set(false);
                    this.errorCuentas.set(mensajeDeError(e));
                }
            });
    }

    nuevaCuenta(): void {
        this._dialog
            .open<CuentaDialogComponent, void, Cuenta>(CuentaDialogComponent, { width: '30rem', maxWidth: '95vw' })
            .afterClosed()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((cuenta) => {
                if (!cuenta) return;
                this.cuentas.update((lista) => [...lista, cuenta]);
                this.elegirCuenta(cuenta.cuentaId);
            });
    }

    /** Una cuenta pertenece a una empresa: sin ninguna dada de alta no hay dónde crearla, así que el primer paso también se puede dar aquí. */
    nuevaEmpresa(): void {
        this._dialog
            .open<EmpresaDialogComponent, void, Empresa>(EmpresaDialogComponent, { width: '28rem', maxWidth: '95vw' })
            .afterClosed()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((empresa) => {
                if (!empresa) return;
                this.empresas.update((lista) => [...lista, empresa]);
            });
    }

    /** Borra la cuenta elegida con sus movimientos; el API se niega (409) si tiene conciliaciones confirmadas. */
    eliminarCuenta(): void {
        const cuenta = this.cuenta();
        if (cuenta === null || this.procesando()) return;
        this._confirmacion
            .open({
                title: 'Eliminar cuenta',
                // Texto fijo: Fuse pinta `message` con [innerHTML], así que no se le interpola nada capturado (p. ej. el alias de la cuenta).
                message:
                    '¿Eliminar esta cuenta? Se borrarán la cuenta, todos sus movimientos importados y las conciliaciones sugeridas. ' +
                    'No se puede deshacer: para recuperar los movimientos habría que volver a importar el archivo del banco. ' +
                    'Si la cuenta ya tiene conciliaciones confirmadas no se elimina: deshazlas antes.',
                icon: { show: true, name: 'heroicons_outline:exclamation-triangle', color: 'warn' },
                actions: { confirm: { label: 'Eliminar', color: 'warn' } }
            })
            .afterClosed()
            .pipe(
                filter((resultado) => resultado === 'confirmed'),
                tap(() => this.procesando.set(true)), // bloquea botones y selectores, como una importación en curso
                switchMap(() => this._service.eliminarCuenta(cuenta.cuentaId)),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe({
                next: (r) => {
                    this.procesando.set(false);
                    this.cuentas.update((lista) => lista.filter((c) => c.cuentaId !== cuenta.cuentaId));
                    this.cuentaId.set(null);
                    this._subLista?.unsubscribe();
                    this.cargandoLista.set(false);
                    this.lista.set(null);
                    this.invalidar();
                    this._snackBar.open(`Cuenta eliminada (${r.movimientos} ${r.movimientos === 1 ? 'movimiento' : 'movimientos'}).`, 'Cerrar', { duration: 5000 });
                },
                error: (e) => {
                    this.procesando.set(false);
                    this._snackBar.open(mensajeDeError(e), 'Cerrar', { duration: 7000 });
                }
            });
    }

    elegirCuenta(id: number): void {
        this.cuentaId.set(id);
        this.invalidar();
        this.lista.set(null);
        this.cargarLista(1);
    }

    alElegirArchivo(evento: Event): void {
        const entrada = evento.target as HTMLInputElement;
        const archivo = entrada.files?.[0] ?? null;
        entrada.value = ''; // permite volver a elegir el mismo archivo
        if (!archivo) return;

        // Un archivo que el servidor va a rechazar no se sube: se avisa aquí, sin esperar a subirlo entero.
        const motivo = motivoArchivoInvalido(archivo);
        this.archivo.set(motivo ? null : archivo);
        this.hojas.set([]);
        this.hoja.set(null);
        this.invalidar();
        if (motivo) {
            this.errorImportacion.set(motivo);
            return;
        }
        this.cargandoHojas.set(true);
        this._subHojas?.unsubscribe();
        this._subHojas = this._service
            .hojas(archivo)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (hojas) => {
                    this.cargandoHojas.set(false);
                    this.hojas.set(hojas);
                    // Con varias hojas se preselecciona la primera que se reconoce como movimientos bancarios.
                    const bancaria = hojas.find((h) => h.formatoDetectado === 'BancoA' || h.formatoDetectado === 'BancoB');
                    this.hoja.set(hojas.length > 1 ? (bancaria?.nombre ?? null) : null);
                },
                error: (e) => {
                    this.cargandoHojas.set(false);
                    this.archivo.set(null);
                    this.errorImportacion.set(mensajeDeError(e));
                }
            });
    }

    elegirHoja(nombre: string): void {
        this.hoja.set(nombre);
        this.invalidar();
    }

    /** Vista previa (`soloValidar`): el API revisa el archivo y cuenta lo que haría, sin guardar nada. */
    validar(): void {
        this.ejecutar(true);
    }

    /** Solo después de una vista previa de esta cuenta, este archivo y esta hoja. */
    confirmar(): void {
        this.ejecutar(false);
    }

    cargarLista(pagina: number): void {
        const cuentaId = this.cuentaId();
        this._subLista?.unsubscribe(); // una respuesta tardía de otra cuenta o de otros filtros no debe pisar la actual
        if (cuentaId === null || this.fechasInvalidas) {
            this.cargandoLista.set(false);
            return;
        }

        this.cargandoLista.set(true);
        this.errorLista.set(null);
        this._subLista = this._service
            .listarMovimientos({ cuentaId, desde: this.desde, hasta: this.hasta, q: this.q.trim(), pagina, tamano: TAMANO_PAGINA })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (lista) => {
                    this.cargandoLista.set(false);
                    this.lista.set(lista);
                },
                error: (e) => {
                    this.cargandoLista.set(false);
                    this.errorLista.set(mensajeDeError(e));
                }
            });
    }

    limpiarFiltros(): void {
        this.desde = this.hasta = this.q = '';
        this.cargarLista(1);
    }

    /** Cambió la cuenta, el archivo o la hoja: lo previsto y lo mostrado ya no corresponde. */
    private invalidar(): void {
        this.vistaPrevia.set(null);
        this.resultado.set(null);
        this.errorImportacion.set(null);
    }

    private ejecutar(soloValidar: boolean): void {
        const cuentaId = this.cuentaId();
        const archivo = this.archivo();
        // Las señales se actualizan al instante: un segundo clic antes de que se pinte el botón deshabilitado cae aquí.
        if (cuentaId === null || archivo === null || !(soloValidar ? this.puedeValidar() : this.puedeConfirmar())) return;

        this.procesando.set(true);
        this.errorImportacion.set(null);
        this.resultado.set(null);
        if (soloValidar) this.vistaPrevia.set(null);
        this._service
            .importarMovimientos(cuentaId, archivo, this.hojas().length > 1 ? this.hoja() : null, soloValidar)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (r) => {
                    this.procesando.set(false);
                    if (soloValidar) {
                        this.vistaPrevia.set(r);
                        return;
                    }
                    this.vistaPrevia.set(null);
                    this.resultado.set(r);
                    this.cargarLista(1);
                    this.historial?.recargar();
                },
                error: (e) => {
                    this.procesando.set(false);
                    this.errorImportacion.set(mensajeDeError(e));
                }
            });
    }
}
