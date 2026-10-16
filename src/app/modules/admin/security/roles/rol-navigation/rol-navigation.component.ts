import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { RolService } from 'app/modules/admin/security/roles/roles.service';
import {
    ModuloRol, PermisoCatalogo, Seleccion, VistaRol, alternarPermiso, construirModulos, etiquetaPermiso, filtrarModulos,
    permisosVisibles, resumenModulo, seleccionarModulo, seleccionarVista
} from '../roles-permisos.utils';

type Estado = 'todo' | 'parcial' | 'nada';

/**
 * Permisos de un rol: una tarjeta por módulo del menú y, dentro, cada vista con sus permisos como botones.
 * Es solo la parte visual: recibe la selección y emite la nueva (sin modificarla).
 */
@Component({
    selector: 'app-role-navigation',
    templateUrl: './rol-navigation.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, MatCheckboxModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule]
})
export class RoleNavigationComponent implements OnInit, OnChanges {
    /** Menú de la aplicación (de él salen los módulos y sus vistas). */
    @Input() navigation: FuseNavigationItem[] = [];
    /** Permisos elegidos por vista. */
    @Input() seleccion: Seleccion = {};
    @Output() seleccionChange = new EventEmitter<Seleccion>();

    modulos: ModuloRol[] = [];
    /** Módulos tal como se muestran (según búsqueda y filtro). */
    visibles: ModuloRol[] = [];
    resumenes: { [moduloId: string]: { activas: number; total: number; estado: Estado } } = {};
    permisosPorVista: { [vistaId: string]: PermisoCatalogo[] } = {};

    catalogo: PermisoCatalogo[] = [];
    cargando = true;
    error: string | null = null;

    busqueda = '';
    soloAsignadas = false;
    private expandidos = new Set<string>();

    constructor(private _rolService: RolService, private _cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        this.cargarCatalogo();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['navigation']) {
            this.modulos = construirModulos(this.navigation);
            this.calcularPermisosPorVista();
        }
        this.actualizar();
    }

    cargarCatalogo(): void {
        this.cargando = true;
        this.error = null;
        this._rolService.getCatalogoPermisos().subscribe({
            next: (catalogo) => {
                this.catalogo = catalogo;
                this.cargando = false;
                this.calcularPermisosPorVista();
                this.actualizar();
            },
            error: (err) => {
                this.cargando = false;
                this.error = `No se pudieron cargar los permisos (${err?.status || 'sin conexión'}). Inténtalo de nuevo.`;
                this._cdr.markForCheck();
            }
        });
    }

    private calcularPermisosPorVista(): void {
        this.permisosPorVista = {};
        for (const m of this.modulos) {
            for (const v of m.vistas) this.permisosPorVista[v.id] = permisosVisibles(v.id, this.catalogo);
        }
    }

    /** Recalcula lo que se muestra: aplica la búsqueda y el filtro «solo con acceso» y los totales de cada módulo. */
    actualizar(): void {
        this.resumenes = {};
        for (const m of this.modulos) this.resumenes[m.id] = resumenModulo(m, this.seleccion);

        let lista = filtrarModulos(this.modulos, this.busqueda);
        if (this.soloAsignadas) {
            lista = lista
                .map(m => ({ ...m, vistas: m.vistas.filter(v => (this.seleccion[v.id]?.length ?? 0) > 0) }))
                .filter(m => m.vistas.length > 0);
        }
        this.visibles = lista;
        this._cdr.markForCheck();
    }

    // ------------------------------------------------------------------ módulos plegables

    estaExpandido(m: ModuloRol): boolean {
        return this.busqueda.trim() !== '' || this.soloAsignadas || this.expandidos.has(m.id);
    }

    alternarModulo(m: ModuloRol): void {
        if (this.expandidos.has(m.id)) this.expandidos.delete(m.id);
        else this.expandidos.add(m.id);
    }

    expandirTodo(): void {
        this.modulos.forEach(m => this.expandidos.add(m.id));
    }

    contraerTodo(): void {
        this.expandidos.clear();
    }

    // ------------------------------------------------------------------ estado de cada casilla

    /** Estado de la casilla de un módulo según las vistas que se están mostrando. */
    estadoModulo(m: ModuloRol): Estado {
        return resumenModulo(m, this.seleccion).estado;
    }

    estadoVista(v: VistaRol): Estado {
        const total = this.permisosPorVista[v.id]?.length ?? 0;
        const elegidos = (this.seleccion[v.id] ?? []).length;
        return elegidos === 0 ? 'nada' : elegidos >= total ? 'todo' : 'parcial';
    }

    tienePermiso(v: VistaRol, p: PermisoCatalogo): boolean {
        return (this.seleccion[v.id] ?? []).includes(p.permisoId);
    }

    etiqueta(v: VistaRol, p: PermisoCatalogo): string {
        return etiquetaPermiso(v.id, p);
    }

    porcentaje(m: ModuloRol): number {
        const r = this.resumenes[m.id];
        return r && r.total > 0 ? Math.round((r.activas / r.total) * 100) : 0;
    }

    // ------------------------------------------------------------------ cambios (se emite una selección nueva)

    onModulo(m: ModuloRol, marcado: boolean): void {
        this.seleccionChange.emit(seleccionarModulo(this.seleccion, m, marcado, this.catalogo));
    }

    onVista(v: VistaRol, marcado: boolean): void {
        this.seleccionChange.emit(seleccionarVista(this.seleccion, v.id, marcado, this.catalogo));
    }

    onPermiso(v: VistaRol, p: PermisoCatalogo): void {
        this.seleccionChange.emit(alternarPermiso(this.seleccion, v.id, p.permisoId));
    }

    trackPorId = (_: number, item: { id: string }) => item.id;
    trackPorPermiso = (_: number, p: PermisoCatalogo) => p.permisoId;
}
