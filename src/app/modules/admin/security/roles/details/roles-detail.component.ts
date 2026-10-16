import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { FuseNavigationItem } from '@fuse/components/navigation';
import { defaultNavigation } from 'app/mock-api/common/navigation/data';
import { RolService } from 'app/modules/admin/security/roles/roles.service';
import { RoleNavigationModule } from '../rol-navigation/rol-navigation.module';
import { Seleccion, contarCambios, seleccionDeRol, vistasParaGuardar } from '../roles-permisos.utils';

@Component({
    selector: 'roles-details',
    templateUrl: './roles-detail.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    // La app convierte todo lo que sigue a un <router-outlet> en un contenedor flex en columna: el detalle debe llenar el alto
    // que le deja la lista y poder encogerse (min-h-0), o su contenido se desborda y no hay forma de bajar.
    host: { class: 'flex flex-col flex-auto min-h-0 min-w-0' },
    imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink, RoleNavigationModule],
})
export class RolesDetailsComponent implements OnInit, OnDestroy {

    rol: any;
    navigation: FuseNavigationItem[] = [];
    loadError: string | null = null;
    guardando = false;

    nombre = '';
    private nombreOriginal = '';

    /** Permisos como están guardados y como se están editando. */
    seleccionOriginal: Seleccion = {};
    seleccion: Seleccion = {};

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _rolService: RolService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) { }

    ngOnInit(): void {
        // El rol abierto (y de nuevo cada vez que se guarda o se vuelve a pedir la lista)
        this._rolService.rol$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((rol: any) => {
                if (!rol) return;
                this.rol = rol;
                this.nombre = rol.nombreRol || '';
                this.nombreOriginal = this.nombre;
                this.seleccionOriginal = seleccionDeRol(rol);
                this.seleccion = { ...this.seleccionOriginal };
                this._changeDetectorRef.markForCheck();
            });

        // Menú completo (de él salen los módulos y vistas)
        this._rolService.getNavigation()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (nav: any) => {
                    this.loadError = null;
                    this.navigation = nav?.default || nav || [];
                    this._changeDetectorRef.markForCheck();
                },
                error: (err) => {
                    console.error('[RolesDetail] Error cargando navegación:', err);
                    this.loadError = 'No se pudo cargar el menú del servidor; se usa la copia local.';
                    this.navigation = defaultNavigation || [];
                    this._changeDetectorRef.markForCheck();
                }
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // ------------------------------------------------------------------ estado de edición

    get esNuevo(): boolean {
        return this.rol?.rolId === 0;
    }

    get cambios(): number {
        return contarCambios(this.seleccionOriginal, this.seleccion);
    }

    get nombreCambio(): boolean {
        return this.nombre.trim() !== this.nombreOriginal.trim();
    }

    get hayCambios(): boolean {
        return this.nombreCambio || this.cambios > 0;
    }

    get puedeGuardar(): boolean {
        return !this.guardando && this.nombre.trim().length > 0 && (this.hayCambios || this.esNuevo);
    }

    get totalVistas(): number {
        return vistasParaGuardar(this.seleccion).length;
    }

    get totalPermisos(): number {
        return vistasParaGuardar(this.seleccion).reduce((suma, v) => suma + v.permisos.length, 0);
    }

    get textoCambios(): string {
        if (this.esNuevo && this.nombre.trim().length === 0) return 'Escribe un nombre para el rol.';
        const partes: string[] = [];
        if (this.cambios > 0) partes.push(`${this.cambios} ${this.cambios === 1 ? 'cambio' : 'cambios'} en permisos`);
        if (this.nombreCambio && !this.esNuevo) partes.push('nombre modificado');
        return partes.length ? `${partes.join(' y ')} sin guardar` : 'Rol nuevo sin guardar';
    }

    onSeleccion(seleccion: Seleccion): void {
        this.seleccion = seleccion;
        this._changeDetectorRef.markForCheck();
    }

    descartar(): void {
        this.nombre = this.nombreOriginal;
        this.seleccion = { ...this.seleccionOriginal };
        this._changeDetectorRef.markForCheck();
    }

    // ------------------------------------------------------------------ guardar

    guardar(): void {
        if (!this.puedeGuardar) return;

        const payload = {
            rolId: this.rol?.rolId ? parseInt(this.rol.rolId, 10) : 0,
            nombreRol: this.nombre.trim(),
            vistas: vistasParaGuardar(this.seleccion)
        };

        this.guardando = true;
        this._rolService.updateRoles(payload).subscribe({
            next: (rolId) => {
                this.guardando = false;
                this.sincronizarSesion(payload);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Rol guardado', showConfirmButton: false, timer: 2500 });
                // Un rol nuevo ya tiene su número: se abre con él
                if (Number(this._activatedRoute.snapshot.paramMap.get('id')) !== rolId) {
                    this._router.navigate(['../', rolId], { relativeTo: this._activatedRoute });
                }
                this._changeDetectorRef.markForCheck();
            },
            error: (err) => {
                this.guardando = false;
                Swal.fire('No se pudo guardar el rol', typeof err?.error === 'string' && err.error ? err.error : (err?.error?.mensaje || 'Inténtalo de nuevo.'), 'error');
                this._changeDetectorRef.markForCheck();
            }
        });
    }

    /** Si se editó el rol de la persona con sesión abierta, sus permisos guardados en el navegador se actualizan al momento. */
    private sincronizarSesion(payload: { rolId: number; nombreRol: string; vistas: { vistaId: string; permisos: number[] }[] }): void {
        try {
            const storedRaw = localStorage.getItem('userInformation');
            if (!storedRaw) return;

            const info = JSON.parse(storedRaw);
            const currentRolId = Number(info.usuario?.rolId || info.rolId || info.usuario?.idRol || 0);
            const currentRoles: string[] = info.roles || [];
            const esMismoRol = (currentRolId > 0 && currentRolId === Number(payload.rolId)) ||
                currentRoles.some((r: string) => r.toLowerCase() === (payload.nombreRol || '').toLowerCase());
            if (!esMismoRol) return;

            if (!info.permisos) info.permisos = [];
            const vistasIds = payload.vistas.map(v => v.vistaId);
            info.permisos = info.permisos.filter((p: any) => !vistasIds.includes(p.vista?.nombreVista || p.vistaId || p.nombreVista));
            payload.vistas.forEach(v => v.permisos.forEach((pId: number) => info.permisos.push({ permisoId: pId, vista: { nombreVista: v.vistaId } })));
            localStorage.setItem('userInformation', JSON.stringify(info));
        } catch (err) {
            console.error('Error sincronizando userInformation local:', err);
        }
    }

    // ------------------------------------------------------------------ salir de la pantalla

    /** Lo usa la ruta: si hay cambios sin guardar pregunta antes de salir; un rol nuevo que no se guardó se quita de la lista. */
    async puedeSalir(): Promise<boolean> {
        if (this.hayCambios) {
            const respuesta = await Swal.fire({
                icon: 'warning',
                title: 'Hay cambios sin guardar',
                text: 'Si sales ahora se perderán los cambios de este rol.',
                showCancelButton: true,
                confirmButtonText: 'Salir sin guardar',
                cancelButtonText: 'Seguir editando'
            });
            if (!respuesta.isConfirmed) return false;
        }
        if (this.esNuevo) this._rolService.descartarNuevo();
        return true;
    }
}
