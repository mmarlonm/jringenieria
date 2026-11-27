import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { defaultNavigation } from 'app/mock-api/common/navigation/data';
import { ModuloRol, construirModulos } from 'app/modules/admin/security/roles/roles-permisos.utils';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import {
    DescargaItem,
    DescargasResumen,
    ReportesService,
    UsuarioPorVista,
    VistaConUsuarios
} from './reportes.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface VistaItemConUsuarios {
    id: string;
    titulo: string;
    icono?: string;
    grupo?: string;
    vistaId?: number;
    ruta?: string;
    usuarios: UsuarioPorVista[];
}

export interface ModuloConUsuarios {
    id: string;
    titulo: string;
    icono?: string;
    vistas: VistaItemConUsuarios[];
}

export interface AccesoPorUsuario {
    usuarioId: number;
    nombreUsuario: string;
    email: string;
    activo: boolean;
    accesos: {
        modulo: string;
        vistaTitulo: string;
        vistaId: string;
        roles: string[];
    }[];
}

@Component({
    selector: 'app-reportes',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatTooltipModule
    ],
    templateUrl: './reportes.component.html',
    styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {
    private _reportesService = inject(ReportesService);
    private _navService = inject(NavigationService);
    private _cdr = inject(ChangeDetectorRef);

    readonly Math = Math;

    tabActiva: 'usuarios' | 'descargas' = 'usuarios';

    // -------------------------------------------------------------------------
    // Pestaña 1: Usuarios por módulo
    // -------------------------------------------------------------------------
    cargandoUsuarios = false;
    incluirInactivos = false;
    modoVista: 'modulo' | 'usuario' = 'modulo';
    filtroModulo = '';
    buscarUsuario = '';

    modulosConUsuarios: ModuloConUsuarios[] = [];
    accesosPorUsuario: AccesoPorUsuario[] = [];
    modulosLista: { id: string; titulo: string }[] = [];

    // -------------------------------------------------------------------------
    // Pestaña 2: Descargas
    // -------------------------------------------------------------------------
    cargandoDescargas = false;
    exportandoDescargas = false;
    filtroDesde = '';
    filtroHasta = '';
    filtroModuloDescarga = '';
    filtroTexto = '';
    filtroUsuarioId: number | null = null;

    paginaActual = 1;
    tamanoPagina = 50;
    totalDescargas = 0;
    descargas: DescargaItem[] = [];
    resumen: DescargasResumen | null = null;

    ngOnInit(): void {
        this.inicializarFechasMesActual();
        this.cargarUsuariosPorModulo();
        this.cargarDescargas();
    }

    inicializarFechasMesActual(): void {
        const ahora = new Date();
        const yyyy = ahora.getFullYear();
        const mm = String(ahora.getMonth() + 1).padStart(2, '0');
        const dd = String(ahora.getDate()).padStart(2, '0');
        this.filtroDesde = `${yyyy}-${mm}-01`;
        this.filtroHasta = `${yyyy}-${mm}-${dd}`;
    }

    // =========================================================================
    // Métodos Pestaña 1: Usuarios por módulo
    // =========================================================================

    cargarUsuariosPorModulo(): void {
        this.cargandoUsuarios = true;
        this._cdr.markForCheck();

        // 1. Obtener menú de navegación
        this._navService.get().subscribe({
            next: (nav) => {
                const navItems = (nav && nav.default) ? nav.default : defaultNavigation;
                this.procesarMenuYUsuarios(navItems);
            },
            error: () => {
                // Fallback a defaultNavigation
                this.procesarMenuYUsuarios(defaultNavigation);
            }
        });
    }

    private procesarMenuYUsuarios(navItems: any[]): void {
        const modulosMenu = construirModulos(navItems);

        this._reportesService.obtenerUsuariosPorVista(this.incluirInactivos).subscribe({
            next: (apiVistas) => {
                this.construirJerarquiaUsuarios(modulosMenu, apiVistas);
                this.cargandoUsuarios = false;
                this._cdr.markForCheck();
            },
            error: () => {
                this.cargandoUsuarios = false;
                this._cdr.markForCheck();
            }
        });
    }

    construirJerarquiaUsuarios(modulosMenu: ModuloRol[], apiVistas: VistaConUsuarios[]): void {
        const vistaMap = new Map<string, VistaConUsuarios>();
        for (const v of apiVistas) {
            vistaMap.set(v.nombreVista, v);
        }

        const modulos: ModuloConUsuarios[] = [];
        const vistasEmparejadas = new Set<string>();

        for (const mod of modulosMenu) {
            const vistasDelModulo: VistaItemConUsuarios[] = [];
            for (const v of mod.vistas) {
                vistasEmparejadas.add(v.id);
                const datosApi = vistaMap.get(v.id);
                vistasDelModulo.push({
                    id: v.id,
                    titulo: v.titulo,
                    icono: v.icono,
                    grupo: v.grupo,
                    vistaId: datosApi?.vistaId,
                    ruta: datosApi?.ruta,
                    usuarios: datosApi?.usuarios || []
                });
            }
            modulos.push({
                id: mod.id,
                titulo: mod.titulo,
                icono: mod.icono,
                vistas: vistasDelModulo
            });
        }

        // Vistas huérfanas van a "Otros"
        const otrasVistas: VistaItemConUsuarios[] = [];
        for (const v of apiVistas) {
            if (!vistasEmparejadas.has(v.nombreVista)) {
                otrasVistas.push({
                    id: v.nombreVista,
                    titulo: v.nombreVista,
                    vistaId: v.vistaId,
                    ruta: v.ruta,
                    usuarios: v.usuarios || []
                });
            }
        }

        if (otrasVistas.length > 0) {
            modulos.push({
                id: '__otros',
                titulo: 'Otros',
                icono: 'heroicons_outline:dots-horizontal',
                vistas: otrasVistas
            });
        }

        this.modulosConUsuarios = modulos;
        this.modulosLista = modulos.map(m => ({ id: m.id, titulo: m.titulo }));

        // Construir agrupación alterna: Por usuario
        this.construirAccesosPorUsuario(modulos);
    }

    private construirAccesosPorUsuario(modulos: ModuloConUsuarios[]): void {
        const userMap = new Map<number, AccesoPorUsuario>();

        for (const mod of modulos) {
            for (const v of mod.vistas) {
                for (const u of v.usuarios) {
                    if (!userMap.has(u.usuarioId)) {
                        userMap.set(u.usuarioId, {
                            usuarioId: u.usuarioId,
                            nombreUsuario: u.nombreUsuario,
                            email: u.email,
                            activo: u.activo,
                            accesos: []
                        });
                    }

                    userMap.get(u.usuarioId)!.accesos.push({
                        modulo: mod.titulo,
                        vistaTitulo: v.titulo,
                        vistaId: v.id,
                        roles: u.roles || []
                    });
                }
            }
        }

        this.accesosPorUsuario = Array.from(userMap.values())
            .sort((a, b) => a.nombreUsuario.localeCompare(b.nombreUsuario));
    }

    get modulosFiltrados(): ModuloConUsuarios[] {
        let lista = this.modulosConUsuarios;

        if (this.filtroModulo) {
            lista = lista.filter(m => m.id === this.filtroModulo);
        }

        if (!this.buscarUsuario.trim()) {
            return lista;
        }

        const termino = this.buscarUsuario.trim().toLowerCase();
        return lista.map(m => {
            const vistasFiltradas = m.vistas.map(v => {
                const usuariosFiltrados = v.usuarios.filter(u =>
                    u.nombreUsuario.toLowerCase().includes(termino) ||
                    u.email.toLowerCase().includes(termino)
                );
                return { ...v, usuarios: usuariosFiltrados };
            }).filter(v => v.usuarios.length > 0);

            return { ...m, vistas: vistasFiltradas };
        }).filter(m => m.vistas.length > 0);
    }

    get usuariosFiltrados(): AccesoPorUsuario[] {
        let lista = this.accesosPorUsuario;

        if (this.filtroModulo) {
            const moduloObj = this.modulosConUsuarios.find(m => m.id === this.filtroModulo);
            const moduloTitulo = moduloObj ? moduloObj.titulo : this.filtroModulo;
            lista = lista.filter(u => u.accesos.some(a => a.modulo === moduloTitulo));
        }

        if (!this.buscarUsuario.trim()) {
            return lista;
        }

        const termino = this.buscarUsuario.trim().toLowerCase();
        return lista.filter(u =>
            u.nombreUsuario.toLowerCase().includes(termino) ||
            u.email.toLowerCase().includes(termino)
        );
    }

    onCambiarInactivos(): void {
        this.cargarUsuariosPorModulo();
    }

    async exportarUsuariosExcel(): Promise<void> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'JR Ingeniería';
        workbook.created = new Date();

        // Hoja 1: Usuarios por Módulo
        const hoja1 = workbook.addWorksheet('Usuarios por Módulo');
        hoja1.columns = [
            { header: 'Módulo', key: 'modulo', width: 25 },
            { header: 'Subgrupo / Sección', key: 'subgrupo', width: 25 },
            { header: 'Vista / Pantalla', key: 'vista', width: 30 },
            { header: 'Clave Vista', key: 'clave', width: 25 },
            { header: 'Ruta', key: 'ruta', width: 30 },
            { header: 'ID Usuario', key: 'usuarioId', width: 12 },
            { header: 'Usuario', key: 'nombreUsuario', width: 25 },
            { header: 'Correo', key: 'email', width: 30 },
            { header: 'Estatus', key: 'estatus', width: 12 },
            { header: 'Roles que dan acceso', key: 'roles', width: 30 }
        ];
        hoja1.getRow(1).font = { bold: true };

        for (const mod of this.modulosConUsuarios) {
            for (const v of mod.vistas) {
                if (v.usuarios && v.usuarios.length > 0) {
                    for (const u of v.usuarios) {
                        hoja1.addRow({
                            modulo: mod.titulo,
                            subgrupo: v.grupo || '',
                            vista: v.titulo,
                            clave: v.id,
                            ruta: v.ruta || '',
                            usuarioId: u.usuarioId,
                            nombreUsuario: u.nombreUsuario,
                            email: u.email,
                            estatus: u.activo ? 'Activo' : 'Inactivo',
                            roles: (u.roles || []).join(', ')
                        });
                    }
                } else {
                    hoja1.addRow({
                        modulo: mod.titulo,
                        subgrupo: v.grupo || '',
                        vista: v.titulo,
                        clave: v.id,
                        ruta: v.ruta || '',
                        usuarioId: '',
                        nombreUsuario: '(Sin usuarios asignados)',
                        email: '',
                        estatus: '',
                        roles: ''
                    });
                }
            }
        }

        // Hoja 2: Acceso por Usuario
        const hoja2 = workbook.addWorksheet('Acceso por Usuario');
        hoja2.columns = [
            { header: 'ID Usuario', key: 'usuarioId', width: 12 },
            { header: 'Usuario', key: 'nombreUsuario', width: 25 },
            { header: 'Correo', key: 'email', width: 30 },
            { header: 'Estatus', key: 'estatus', width: 12 },
            { header: 'Módulo', key: 'modulo', width: 25 },
            { header: 'Vista / Pantalla', key: 'vista', width: 30 },
            { header: 'Clave Vista', key: 'clave', width: 25 },
            { header: 'Roles', key: 'roles', width: 30 }
        ];
        hoja2.getRow(1).font = { bold: true };

        for (const u of this.accesosPorUsuario) {
            for (const acc of u.accesos) {
                hoja2.addRow({
                    usuarioId: u.usuarioId,
                    nombreUsuario: u.nombreUsuario,
                    email: u.email,
                    estatus: u.activo ? 'Activo' : 'Inactivo',
                    modulo: acc.modulo,
                    vista: acc.vistaTitulo,
                    clave: acc.vistaId,
                    roles: (acc.roles || []).join(', ')
                });
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `reporte-usuarios-por-modulo-${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    // =========================================================================
    // Métodos Pestaña 2: Descargas
    // =========================================================================

    cargarDescargas(): void {
        this.cargandoDescargas = true;
        this._cdr.markForCheck();

        // Cargar resumen
        this._reportesService.obtenerResumenDescargas(this.filtroDesde, this.filtroHasta).subscribe({
            next: (res) => {
                this.resumen = res;
                this._cdr.markForCheck();
            },
            error: () => {}
        });

        // Cargar tabla paginada
        this._reportesService.obtenerDescargas(
            this.filtroDesde,
            this.filtroHasta,
            this.filtroUsuarioId,
            this.filtroModuloDescarga,
            this.filtroTexto,
            this.paginaActual,
            this.tamanoPagina
        ).subscribe({
            next: (resp) => {
                this.descargas = resp.items || [];
                this.totalDescargas = resp.total || 0;
                this.cargandoDescargas = false;
                this._cdr.markForCheck();
            },
            error: () => {
                this.descargas = [];
                this.totalDescargas = 0;
                this.cargandoDescargas = false;
                this._cdr.markForCheck();
            }
        });
    }

    aplicarFiltrosDescargas(): void {
        this.paginaActual = 1;
        this.cargarDescargas();
    }

    cambiarPagina(nuevaPagina: number): void {
        if (nuevaPagina < 1 || nuevaPagina > this.totalPaginas) return;
        this.paginaActual = nuevaPagina;
        this.cargarDescargas();
    }

    get totalPaginas(): number {
        return Math.max(1, Math.ceil(this.totalDescargas / this.tamanoPagina));
    }

    formatearTamano(bytes: number | null): string {
        if (bytes == null || isNaN(bytes)) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    async exportarDescargasExcel(): Promise<void> {
        this.exportandoDescargas = true;
        this._cdr.markForCheck();

        try {
            const items = await firstValueFrom(
                this._reportesService.exportarDescargas(
                    this.filtroDesde,
                    this.filtroHasta,
                    this.filtroUsuarioId,
                    this.filtroModuloDescarga,
                    this.filtroTexto
                )
            );

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'JR Ingeniería';
            workbook.created = new Date();

            const hoja = workbook.addWorksheet('Bitácora de Descargas');
            hoja.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Fecha y Hora (México)', key: 'fecha', width: 22 },
                { header: 'Usuario', key: 'usuario', width: 25 },
                { header: 'Origen', key: 'origen', width: 18 },
                { header: 'Módulo', key: 'modulo', width: 22 },
                { header: 'Nombre de Archivo', key: 'archivo', width: 35 },
                { header: 'Ruta', key: 'ruta', width: 35 },
                { header: 'Tamaño (Bytes)', key: 'tamano', width: 16 }
            ];
            hoja.getRow(1).font = { bold: true };

            for (const item of (items || [])) {
                const fechaMx = item.fechaUtc
                    ? new Date(item.fechaUtc).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
                    : '';
                hoja.addRow({
                    id: item.id,
                    fecha: fechaMx,
                    usuario: item.usuarioNombre || (item.origen === 'VisorDocumentos' ? 'Visor de documentos' : 'Sin sesión'),
                    origen: item.origen,
                    modulo: item.modulo,
                    archivo: item.nombreArchivo,
                    ruta: item.ruta,
                    tamano: item.tamanoBytes ?? ''
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `reporte-descargas-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err: any) {
            const mensaje = err?.error?.mensaje || 'Error al exportar descargas';
            Swal.fire({
                icon: 'error',
                title: 'Error al exportar',
                text: mensaje
            });
        } finally {
            this.exportandoDescargas = false;
            this._cdr.markForCheck();
        }
    }
}
