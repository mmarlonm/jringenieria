import { DatePipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatDateFormats } from '@angular/material/core';
import { provideLuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateTime } from 'luxon';
import { Subscription } from 'rxjs';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import { FinanzasService } from '../finanzas.service';
import { Empresa, Pagina, PaqueteDespacho, VistaPreviaPaquete } from '../finanzas.types';
import { MESES, descargarBlob, fechaUtc, mensajeDeError, mensajeDeErrorBlob, mesAnteriorA, nombrePaquete } from '../finanzas.utils';
import { PaginadorComponent } from '../shared/paginador/paginador.component';

const FORMATOS_MES_ANO: MatDateFormats = {
    parse: { dateInput: ['LLLL yyyy', 'MM/yyyy', 'yyyy-MM'] },
    display: {
        dateInput: 'LLLL yyyy',
        monthYearLabel: 'LLLL yyyy',
        dateA11yLabel: 'LLLL yyyy',
        monthYearA11yLabel: 'LLLL yyyy'
    }
};

@Component({
    selector: 'app-finanzas-despacho',
    standalone: true,
    imports: [
        DatePipe,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatDatepickerModule,
        PaginadorComponent
    ],
    providers: [
        provideLuxonDateAdapter(FORMATOS_MES_ANO)
    ],
    templateUrl: './despacho.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DespachoComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _permisos = inject(PermisosEspecialesService);
    private readonly _document = inject(DOCUMENT);
    private readonly _destroyRef = inject(DestroyRef);

    private _subVistaPrevia?: Subscription;
    private _subHistorial?: Subscription;

    readonly meses = MESES;
    readonly anios: number[];

    readonly cargandoEmpresas = signal(false);
    readonly errorEmpresas = signal<string | null>(null);
    readonly empresas = signal<Empresa[]>([]);
    readonly empresaId = signal<number | null>(null);

    readonly anio = signal<number>(2026);
    readonly mes = signal<number>(1);

    readonly cargandoVistaPrevia = signal(false);
    readonly errorVistaPrevia = signal<string | null>(null);
    readonly vistaPrevia = signal<VistaPreviaPaquete | null>(null);

    readonly cargandoHistorial = signal(false);
    readonly errorHistorial = signal<string | null>(null);
    readonly historial = signal<Pagina<PaqueteDespacho> | null>(null);
    readonly paginaHistorial = signal(1);

    readonly generando = signal(false);
    readonly errorGenerar = signal<string | null>(null);

    readonly puedeExportar = computed(() => this._permisos.tiene('finanzas.exportar'));
    readonly fechaUtc = fechaUtc;

    constructor() {
        const hoy = new Date();
        const defecto = mesAnteriorA(hoy);
        this.anio.set(defecto.anio);
        this.mes.set(defecto.mes);

        const anioActual = hoy.getFullYear();
        this.anios = [anioActual, anioActual - 1, anioActual - 2];
    }

    ngOnInit(): void {
        this.cargarEmpresas();
    }

    cargarEmpresas(): void {
        this.cargandoEmpresas.set(true);
        this.errorEmpresas.set(null);
        this._service.empresas().pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (data) => {
                this.empresas.set(data);
                this.cargandoEmpresas.set(false);
            },
            error: (err) => {
                this.errorEmpresas.set(mensajeDeError(err));
                this.cargandoEmpresas.set(false);
            }
        });
    }

    elegirEmpresa(id: number): void {
        this.empresaId.set(id);
        this.vistaPrevia.set(null);
        this.historial.set(null);
        this.paginaHistorial.set(1);
        this.errorGenerar.set(null);
        this.cargarTodo();
    }

    cambiarAnio(anio: number): void {
        this.anio.set(anio);
        this.errorGenerar.set(null);
        this.cargarVistaPrevia();
    }

    cambiarMes(mes: number): void {
        this.mes.set(mes);
        this.errorGenerar.set(null);
        this.cargarVistaPrevia();
    }

    cargarTodo(): void {
        this.cargarVistaPrevia();
        this.cargarHistorial(1);
    }

    cargarVistaPrevia(): void {
        const empId = this.empresaId();
        const anio = this.anio();
        const mes = this.mes();
        if (!empId) {
            this.vistaPrevia.set(null);
            return;
        }

        this._subVistaPrevia?.unsubscribe();
        this.cargandoVistaPrevia.set(true);
        this.errorVistaPrevia.set(null);
        // Si la consulta del periodo nuevo falla, no deben quedar los recuadros ni el botón del periodo anterior.
        this.vistaPrevia.set(null);

        this._subVistaPrevia = this._service.vistaPreviaDespacho(empId, anio, mes).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (vp) => {
                this.vistaPrevia.set(vp);
                this.cargandoVistaPrevia.set(false);
            },
            error: (err) => {
                this.errorVistaPrevia.set(mensajeDeError(err));
                this.cargandoVistaPrevia.set(false);
            }
        });
    }

    cargarHistorial(pagina = this.paginaHistorial()): void {
        const empId = this.empresaId();
        if (!empId) {
            this.historial.set(null);
            return;
        }

        this._subHistorial?.unsubscribe();
        this.cargandoHistorial.set(true);
        this.errorHistorial.set(null);

        this._subHistorial = this._service.historialDespacho(empId, pagina, 10).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (data) => {
                this.historial.set(data);
                this.paginaHistorial.set(pagina);
                this.cargandoHistorial.set(false);
            },
            error: (err) => {
                this.errorHistorial.set(mensajeDeError(err));
                this.cargandoHistorial.set(false);
            }
        });
    }

    cambiarPaginaHistorial(nuevaPagina: number): void {
        this.cargarHistorial(nuevaPagina);
    }

    generar(): void {
        if (this.generando()) {
            return;
        }

        const empId = this.empresaId();
        const anio = this.anio();
        const mes = this.mes();
        const vp = this.vistaPrevia();
        if (!empId || !vp) {
            return;
        }

        this.generando.set(true);
        this.errorGenerar.set(null);
        const empresa = this.empresas().find(e => e.empresaId === empId);
        const rfc = empresa?.rfc ?? '';

        this._service.generarDespacho({ empresaId: empId, anio, mes }).pipe(
            takeUntilDestroyed(this._destroyRef)
        ).subscribe({
            next: (blob) => {
                descargarBlob(this._document, blob, nombrePaquete(rfc, anio, mes));
                this.generando.set(false);
                this.cargarHistorial(1);
            },
            error: async (err) => {
                const msg = await mensajeDeErrorBlob(err);
                this.errorGenerar.set(msg);
                this.generando.set(false);
            }
        });
    }
    /** `computed` y no `get`: el calendario debe recibir el mismo objeto mientras el periodo no cambie (ver Conciliación). */
    readonly fechaPeriodo = computed(() => DateTime.local(this.anio(), this.mes(), 1));

    alSeleccionarMesPeriodo(fecha: any, picker: any): void {
        const dt = fecha?.toJSDate ? fecha.toJSDate() : (fecha instanceof Date ? fecha : new Date(fecha));
        this.anio.set(dt.getFullYear());
        this.mes.set(dt.getMonth() + 1);
        picker?.close();
        this.errorGenerar.set(null);
        this.cargarVistaPrevia();
    }

    alCambiarFechaPeriodo(fecha: any): void {
        if (!fecha) return;
        const dt = fecha?.toJSDate ? fecha.toJSDate() : (fecha instanceof Date ? fecha : new Date(fecha));
        this.anio.set(dt.getFullYear());
        this.mes.set(dt.getMonth() + 1);
        this.errorGenerar.set(null);
        this.cargarVistaPrevia();
    }

}
