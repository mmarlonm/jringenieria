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
import { Subscription } from 'rxjs';
import '../finanzas.locale'; // registra 'es-MX' (importes de la lista)
import { FinanzasService } from '../finanzas.service';
import { Cfdi, Empresa, HojaInfo, Pagina, ResultadoImportacion } from '../finanzas.types';
import { mensajeDeError } from '../finanzas.utils';
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

const TIPOS = [
    { valor: 'I', texto: 'Ingreso' },
    { valor: 'E', texto: 'Egreso' },
    { valor: 'T', texto: 'Traslado' },
    { valor: 'P', texto: 'Pago' },
    { valor: 'N', texto: 'Nómina' }
];

@Component({
    selector: 'app-finanzas-cfdi',
    standalone: true,
    templateUrl: './cfdi.component.html',
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
export class CfdiComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _dialog = inject(MatDialog);
    private readonly _destroyRef = inject(DestroyRef);
    private _subLista?: Subscription;
    private _subHojas?: Subscription;
    private _ultimoSoloValidar = true;

    @ViewChild(ImportacionesHistorialComponent) historial?: ImportacionesHistorialComponent;

    readonly tipos = TIPOS;
    readonly tipoTexto = (t: string): string => TIPOS.find((x) => x.valor === t)?.texto ?? t;
    readonly etiquetaFormato = (f: HojaInfo['formatoDetectado']): string => ETIQUETA_FORMATO[f];

    // Empresa
    readonly empresas = signal<Empresa[]>([]);
    readonly cargandoEmpresas = signal(false);
    readonly errorEmpresas = signal<string | null>(null);
    readonly empresaId = signal<number | null>(null);

    // Archivo, hojas e importación
    readonly archivo = signal<File | null>(null);
    readonly hojas = signal<HojaInfo[]>([]);
    readonly hoja = signal<string | null>(null);
    readonly cargandoHojas = signal(false);
    readonly importando = signal(false);
    readonly errorImportacion = signal<string | null>(null);
    readonly resultado = signal<ResultadoImportacion | null>(null);
    /** Con varias hojas hay que elegir una; con una sola el API usa la primera con encabezado reconocible. */
    readonly puedeImportar = computed(
        () => this.archivo() !== null && !this.cargandoHojas() && !this.importando() && (this.hojas().length <= 1 || this.hoja() !== null)
    );

    // Lista de CFDI (los filtros se enlazan con ngModel; el resultado vive en señales)
    direccion = '';
    tipo = '';
    estado = '';
    desde = '';
    hasta = '';
    q = '';
    readonly lista = signal<Pagina<Cfdi> | null>(null);
    readonly cargandoLista = signal(false);
    readonly errorLista = signal<string | null>(null);

    ngOnInit(): void {
        this.cargarEmpresas();
    }

    get fechasInvalidas(): boolean {
        return Boolean(this.desde && this.hasta && this.desde > this.hasta);
    }

    get hayFiltros(): boolean {
        return Boolean(this.direccion || this.tipo || this.estado || this.desde || this.hasta || this.q.trim());
    }

    cargarEmpresas(): void {
        this.cargandoEmpresas.set(true);
        this.errorEmpresas.set(null);
        this._service
            .empresas()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (empresas) => {
                    this.cargandoEmpresas.set(false);
                    this.empresas.set(empresas);
                },
                error: (e) => {
                    this.cargandoEmpresas.set(false);
                    this.errorEmpresas.set(mensajeDeError(e));
                }
            });
    }

    nuevaEmpresa(): void {
        this._dialog
            .open<EmpresaDialogComponent, void, Empresa>(EmpresaDialogComponent, { width: '28rem', maxWidth: '95vw' })
            .afterClosed()
            .subscribe((empresa) => {
                if (!empresa) return;
                this.empresas.update((lista) => [...lista, empresa]);
                this.elegirEmpresa(empresa.empresaId);
            });
    }

    elegirEmpresa(id: number): void {
        this.empresaId.set(id);
        this.resultado.set(null);
        this.errorImportacion.set(null);
        this.lista.set(null);
        this.cargarLista(1);
    }

    alElegirArchivo(evento: Event): void {
        const entrada = evento.target as HTMLInputElement;
        const archivo = entrada.files?.[0] ?? null;
        entrada.value = ''; // permite volver a elegir el mismo archivo
        if (!archivo) return;

        this.archivo.set(archivo);
        this.hojas.set([]);
        this.hoja.set(null);
        this.resultado.set(null);
        this.errorImportacion.set(null);
        this.cargandoHojas.set(true);
        this._subHojas?.unsubscribe();
        this._subHojas = this._service
            .hojas(archivo)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (hojas) => {
                    this.cargandoHojas.set(false);
                    this.hojas.set(hojas);
                    // Con varias hojas se preselecciona la primera que se reconoce como CFDI.
                    this.hoja.set(hojas.length > 1 ? (hojas.find((h) => h.formatoDetectado === 'CFDI')?.nombre ?? null) : null);
                },
                error: (e) => {
                    this.cargandoHojas.set(false);
                    this.archivo.set(null);
                    this.errorImportacion.set(mensajeDeError(e));
                }
            });
    }

    /** `soloValidar` = vista previa: el API revisa el archivo y cuenta lo que haría, sin guardar nada. */
    ejecutar(soloValidar: boolean): void {
        const empresaId = this.empresaId();
        const archivo = this.archivo();
        if (empresaId === null || archivo === null || !this.puedeImportar()) return;

        this._ultimoSoloValidar = soloValidar;
        this.importando.set(true);
        this.errorImportacion.set(null);
        this.resultado.set(null);
        this._service
            .importarCfdi(empresaId, archivo, this.hojas().length > 1 ? this.hoja() : null, soloValidar)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (resultado) => {
                    this.importando.set(false);
                    this.resultado.set(resultado);
                    if (!resultado.soloValidar) {
                        this.cargarLista(1);
                        this.historial?.recargar();
                    }
                },
                error: (e) => {
                    this.importando.set(false);
                    this.errorImportacion.set(mensajeDeError(e));
                }
            });
    }

    reintentarImportacion(): void {
        this.ejecutar(this._ultimoSoloValidar);
    }

    cargarLista(pagina: number): void {
        const empresaId = this.empresaId();
        if (empresaId === null || this.fechasInvalidas) return;

        this._subLista?.unsubscribe();
        this.cargandoLista.set(true);
        this.errorLista.set(null);
        this._subLista = this._service
            .listarCfdi({
                empresaId,
                direccion: this.direccion,
                tipo: this.tipo,
                estado: this.estado,
                desde: this.desde,
                hasta: this.hasta,
                q: this.q.trim(),
                pagina,
                tamano: TAMANO_PAGINA
            })
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
        this.direccion = this.tipo = this.estado = this.desde = this.hasta = this.q = '';
        this.cargarLista(1);
    }
}
