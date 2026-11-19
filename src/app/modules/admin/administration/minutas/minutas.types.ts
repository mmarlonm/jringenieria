export interface Minuta {
    minutaId: number;
    folio?: string;
    titulo: string;
    area?: string;
    descripcion?: string;
    fechaReunion: string;
    sucursalId?: number;
    sucursalNombre?: string;
    palabrasClave?: string;
    palabrasClaveLista: string[];
    esPublica: boolean;
    archivoNombreOriginal: string;
    archivoExtension: string;
    archivoContentType: string;
    tamanoBytes: number;
    usuarioCreacionId: number;
    usuarioCreacionNombre: string;
    fechaCreacion: string;
    fechaModificacion?: string;
    usuariosPermitidosIds: number[];
    usuariosPermitidosNombres: string[];
    puedeEditar: boolean;
    puedeEliminar: boolean;
}

export interface MinutaCatalogos {
    sucursales: MinutaSucursal[];
    usuarios: MinutaUsuario[];
    areas?: MinutaArea[];
}

export interface MinutaArea {
    clave: string;
    nombre: string;
}

export interface MinutaSucursal {
    sucursalId: number;
    nombre: string;
}

export interface MinutaUsuario {
    usuarioId: number;
    nombre: string;
    email?: string;
    puesto?: string;
}

export interface MinutaPreviewResponse {
    data: string; // Base64
    contentType: string;
    fileName: string;
    isPdf: boolean;
    isOffice: boolean;
    isImage: boolean;
}
