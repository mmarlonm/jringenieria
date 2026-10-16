import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { agruparPorModulo, filtrarUsuarios } from 'app/core/permisos-especiales/permisos-especiales.utils';
import { PermisosEspecialesService } from 'app/core/permisos-especiales/permisos-especiales.service';
import {
    AsignacionPermiso, GrupoPermisos, PermisoDeUsuario, PermisoEspecial, UsuarioBasico
} from 'app/core/permisos-especiales/permisos-especiales.types';
import { UsersService } from 'app/modules/admin/security/users/users.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-permisos-especiales',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
    templateUrl: './permisos-especiales.component.html',
})
export class PermisosEspecialesComponent implements OnInit {
    private _servicio = inject(PermisosEspecialesService);
    private _usersService = inject(UsersService);
    private _cdr = inject(ChangeDetectorRef);

    vista: 'permiso' | 'usuario' = 'permiso';
    cargando = true;
    errorCarga: string | null = null;

    permisos: PermisoEspecial[] = [];
    grupos: GrupoPermisos[] = [];
    busquedaPermiso = '';
    usuarios: UsuarioBasico[] = [];

    // Pestaña "Por permiso"
    seleccionado: PermisoEspecial | null = null;
    edicion = { nombre: '', descripcion: '', activo: true };
    asignaciones: AsignacionPermiso[] = [];
    cargandoAsignaciones = false;
    busquedaUsuario = '';
    sugerencias: UsuarioBasico[] = [];

    // Pestaña "Por usuario"
    busquedaUsuarioVista = '';
    sugerenciasVista: UsuarioBasico[] = [];
    usuarioElegido: UsuarioBasico | null = null;
    permisosDelUsuario: PermisoDeUsuario[] = [];

    ngOnInit(): void {
        this._usersService.getUsers().subscribe({
            next: usuarios => (this.usuarios = usuarios || []),
            error: () => (this.usuarios = []),
        });
        this.recargarCatalogo();
    }

    // ------------------------------------------------------------------ catálogo

    recargarCatalogo(idParaSeleccionar?: number): void {
        this.cargando = true;
        this._servicio.getCatalogo().subscribe({
            next: lista => {
                this.permisos = lista;
                this.aplicarBusquedaPermiso();
                this.cargando = false;
                this.errorCarga = null;
                const id = idParaSeleccionar ?? this.seleccionado?.id;
                const actual = lista.find(p => p.id === id) ?? null;
                if (actual) this.seleccionar(actual);
                this._cdr.markForCheck();
            },
            error: err => {
                this.cargando = false;
                this.errorCarga = this.mensajeDe(err, 'No se pudo cargar el catálogo de permisos especiales.');
                this._cdr.markForCheck();
            },
        });
    }

    aplicarBusquedaPermiso(): void {
        this.grupos = agruparPorModulo(this.permisos, this.busquedaPermiso);
    }

    seleccionar(permiso: PermisoEspecial): void {
        this.seleccionado = permiso;
        this.edicion = { nombre: permiso.nombre, descripcion: permiso.descripcion ?? '', activo: permiso.activo };
        this.busquedaUsuario = '';
        this.sugerencias = [];
        this.cargarAsignaciones();
    }

    get hayCambios(): boolean {
        const p = this.seleccionado;
        return !!p && (this.edicion.nombre !== p.nombre
            || (this.edicion.descripcion ?? '') !== (p.descripcion ?? '')
            || this.edicion.activo !== p.activo);
    }

    guardarCambios(): void {
        const p = this.seleccionado;
        if (!p) return;
        this._servicio.actualizar(p.id, { ...this.edicion }).subscribe({
            next: () => {
                Swal.fire({ icon: 'success', title: 'Guardado', timer: 1400, showConfirmButton: false });
                this.recargarCatalogo(p.id);
            },
            error: err => Swal.fire('No se pudo guardar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    // ------------------------------------------------------------------ asignaciones

    cargarAsignaciones(): void {
        const p = this.seleccionado;
        if (!p) return;
        this.cargandoAsignaciones = true;
        this._servicio.getAsignaciones(p.id).subscribe({
            next: lista => {
                this.asignaciones = lista;
                this.cargandoAsignaciones = false;
                this._cdr.markForCheck();
            },
            error: err => {
                this.asignaciones = [];
                this.cargandoAsignaciones = false;
                Swal.fire('No se pudieron cargar los usuarios', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error');
                this._cdr.markForCheck();
            },
        });
    }

    buscarUsuario(): void {
        this.sugerencias = filtrarUsuarios(
            this.usuarios, this.busquedaUsuario, this.asignaciones.map(a => a.usuarioId), 8);
    }

    asignar(usuario: UsuarioBasico): void {
        const p = this.seleccionado;
        if (!p) return;
        this._servicio.asignar(p.id, Number(usuario.usuarioId)).subscribe({
            next: () => {
                this.busquedaUsuario = '';
                this.sugerencias = [];
                this.recargarCatalogo(p.id);
            },
            error: err => Swal.fire('No se pudo asignar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    quitar(asignacion: AsignacionPermiso): void {
        const p = this.seleccionado;
        if (!p) return;
        Swal.fire({
            title: '¿Quitar el permiso?',
            text: `${asignacion.nombreUsuario} dejará de poder usar «${p.nombre}».`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar',
        }).then(r => {
            if (!r.isConfirmed) return;
            this._servicio.quitar(asignacion.asignacionId).subscribe({
                next: () => this.recargarCatalogo(p.id),
                error: err => Swal.fire('No se pudo quitar', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
            });
        });
    }

    // ------------------------------------------------------------------ por usuario

    buscarUsuarioVista(): void {
        this.sugerenciasVista = filtrarUsuarios(this.usuarios, this.busquedaUsuarioVista, [], 8);
    }

    elegirUsuario(usuario: UsuarioBasico): void {
        this.usuarioElegido = usuario;
        this.busquedaUsuarioVista = '';
        this.sugerenciasVista = [];
        this.permisosDelUsuario = [];
        this._servicio.getPermisosDeUsuario(Number(usuario.usuarioId)).subscribe({
            next: lista => {
                this.permisosDelUsuario = lista;
                this._cdr.markForCheck();
            },
            error: err => Swal.fire('No se pudieron cargar sus permisos', this.mensajeDe(err, 'Inténtalo de nuevo.'), 'error'),
        });
    }

    // ------------------------------------------------------------------ utilidades

    private mensajeDe(err: any, porDefecto: string): string {
        return err?.error?.mensaje || (err?.status === 403 ? 'No tienes acceso a esta sección.' : porDefecto);
    }
}
