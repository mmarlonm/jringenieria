export interface PermisoEspecial {
    id: number;
    codigo: string;
    nombre: string;
    descripcion?: string | null;
    modulo: string;
    activo: boolean;
    totalAsignados: number;
}

export interface ActualizarPermisoEspecial {
    nombre: string;
    descripcion?: string | null;
    activo: boolean;
}

export interface AsignacionPermiso {
    asignacionId: number;
    usuarioId: number;
    nombreUsuario: string;
    email?: string | null;
    fechaAsignacion: string;
    asignadoPor?: number | null;
}

export interface PermisoDeUsuario {
    asignacionId: number;
    permisoId: number;
    codigo: string;
    nombre: string;
    modulo: string;
    activo: boolean;
}

export interface UsuarioBasico {
    usuarioId: number;
    nombreUsuario: string;
    email?: string | null;
}

export interface GrupoPermisos {
    modulo: string;
    permisos: PermisoEspecial[];
}
