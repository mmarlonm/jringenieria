import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { FinanzasService } from '../finanzas.service';
import { Dashboard, Empresa, IndicadorDashboard } from '../finanzas.types';
import { ORDEN_TARJETAS_DASHBOARD, fechaIsoACorta, formatearMonto, mensajeDeError } from '../finanzas.utils';

@Component({
    selector: 'app-finanzas-dashboard',
    standalone: true,
    imports: [
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSelectModule
    ],
    templateUrl: './dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardFinanzasComponent implements OnInit {
    private readonly _service = inject(FinanzasService);
    private readonly _destroyRef = inject(DestroyRef);

    private _subConsulta?: Subscription;
    private _subEmpresas?: Subscription;

    readonly TODAS = 0;

    readonly empresas = signal<Empresa[]>([]);
    readonly cargandoEmpresas = signal(false);
    readonly errorEmpresas = signal<string | null>(null);

    readonly empresaId = signal<number | null>(null);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly datos = signal<Dashboard | null>(null);

    readonly formatearMonto = formatearMonto;
    readonly fechaCorta = fechaIsoACorta;

    readonly tarjetas = computed(() => {
        const d = this.datos();
        if (!d) return [];
        const mapa = new Map(d.indicadores.map(i => [i.clave, i]));
        return ORDEN_TARJETAS_DASHBOARD
            .map(clave => mapa.get(clave))
            .filter((i): i is IndicadorDashboard => !!i);
    });

    readonly indicadores = computed(() => this.datos()?.indicadores ?? []);

    ngOnInit(): void {
        this.cargarEmpresas();
        this.cargar();
    }

    cargarEmpresas(): void {
        this.cargandoEmpresas.set(true);
        this.errorEmpresas.set(null);
        this._subEmpresas?.unsubscribe();
        this._subEmpresas = this._service.empresas()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (list) => {
                    this.empresas.set(list);
                    this.cargandoEmpresas.set(false);
                },
                error: (err) => {
                    this.errorEmpresas.set(mensajeDeError(err));
                    this.cargandoEmpresas.set(false);
                }
            });
    }

    elegirEmpresa(valor: number): void {
        this.empresaId.set(valor === this.TODAS ? null : valor);
        this.cargar();
    }

    cargar(): void {
        this._subConsulta?.unsubscribe();
        this.cargando.set(true);
        this.error.set(null);
        const id = this.empresaId() ?? undefined;
        this._subConsulta = this._service.dashboard(id)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res) => {
                    this.datos.set(res);
                    this.cargando.set(false);
                },
                error: (err) => {
                    this.error.set(mensajeDeError(err));
                    this.cargando.set(false);
                }
            });
    }
}
