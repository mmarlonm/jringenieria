import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import {
    ModuloRol,
    PermisoCatalogo,
    Seleccion,
    VistaRol,
    etiquetaPermiso,
    seleccionDeRol
} from './roles-permisos.utils';

export interface OpcionesExportacionPdf {
    soloConAcceso?: boolean;
    moduloId?: string | null;
    seleccionOverride?: Seleccion;
    incluirFirmas?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RolesPdfExportService {

    constructor() {}

    /**
     * Genera y descarga la Cédula Oficial de Autorizaciones y Permisos en PDF para un rol individual.
     */
    exportarRolPdf(
        rol: any,
        modulos: ModuloRol[],
        catalogo: PermisoCatalogo[],
        opciones: OpcionesExportacionPdf = {}
    ): void {
        const soloConAcceso = opciones.soloConAcceso ?? true;
        const moduloIdFiltro = opciones.moduloId ?? null;
        const incluirFirmas = opciones.incluirFirmas ?? true;

        const seleccion: Seleccion = opciones.seleccionOverride ?? seleccionDeRol(rol);
        const nombreRol = (rol?.nombreRol || (rol?.rolId === 0 ? 'Rol Nuevo' : 'Sin Nombre')).trim();
        const rolId = rol?.rolId ?? 0;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = { left: 14, right: 14, top: 14, bottom: 18 };
        const contentWidth = pageWidth - margin.left - margin.right; // 182 mm

        let y = margin.top;

        // Filtrar módulos según opciones
        let modulosFiltrados = modulos;
        if (moduloIdFiltro) {
            modulosFiltrados = modulos.filter((m) => m.id === moduloIdFiltro);
        }

        // Métricas del rol
        let totalVistasConAcceso = 0;
        let totalPermisosConcedidos = 0;
        const modulosConAccesoSet = new Set<string>();
        const modulosSinAccesoNombres: string[] = [];

        for (const m of modulos) {
            const vistasActivas = m.vistas.filter((v) => (seleccion[v.id]?.length ?? 0) > 0);
            if (vistasActivas.length > 0) {
                modulosConAccesoSet.add(m.id);
                totalVistasConAcceso += vistasActivas.length;
                vistasActivas.forEach((v) => {
                    totalPermisosConcedidos += (seleccion[v.id]?.length ?? 0);
                });
            } else {
                modulosSinAccesoNombres.push(m.titulo);
            }
        }

        // =========================================================================
        // HELPERS DE RENDERIZADO Y PAGINACIÓN
        // =========================================================================
        const checkSpace = (needed: number, onNewPage?: () => void) => {
            if (y + needed > pageHeight - margin.bottom) {
                doc.addPage();
                dibujarEncabezadoPaginaSiguiente();
                if (onNewPage) {
                    onNewPage();
                }
            }
        };

        const dibujarEncabezadoPagina1 = () => {
            // Fondo azul marino institucional
            doc.setFillColor(15, 23, 42); // slate-900
            doc.roundedRect(margin.left, y, contentWidth, 23, 2, 2, 'F');

            // Título de la empresa
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12.5);
            doc.text('JR INGENIERÍA ELÉCTRICA S.A. DE C.V.', margin.left + 6, y + 7.5);

            // Subtítulos institucionales
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text('SISTEMA INTEGRAL ERP / CRM • CONTROL DE ACCESOS Y SEGURIDAD', margin.left + 6, y + 13.5);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(56, 189, 248); // sky-400
            doc.text('CÉDULA OFICIAL DE AUTORIZACIONES Y PERMISOS POR MÓDULO', margin.left + 6, y + 18.5);

            // Metadatos a la derecha
            const fechaStr = this.formatearFecha(new Date());
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(226, 232, 240); // slate-200
            doc.text(`Emisión: ${fechaStr}`, pageWidth - margin.right - 6, y + 7.5, { align: 'right' });
            doc.text(`Código: SEC-AUT-R${rolId}`, pageWidth - margin.right - 6, y + 13, { align: 'right' });
            doc.text('Estatus: OFICIAL / AUDITABLE', pageWidth - margin.right - 6, y + 18.5, { align: 'right' });

            y += 27;

            // Tarjeta Informativa del Rol
            doc.setFillColor(248, 250, 252); // slate-50
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.3);
            doc.roundedRect(margin.left, y, contentWidth, 20, 2, 2, 'FD');

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(`ROL: ${nombreRol.toUpperCase()}`, margin.left + 6, y + 7.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text(`Identificador de Sistema: Rol #${rolId}   •   Registro de derechos y privilegios de acceso`, margin.left + 6, y + 13.5);

            // Métricas (Pills en la tarjeta)
            const pillY = y + 4.5;
            this.dibujarPillMetrica(doc, pageWidth - margin.right - 62, pillY, 18, 10, 'Módulos', `${modulosConAccesoSet.size}`, [224, 242, 254], [3, 105, 161]);
            this.dibujarPillMetrica(doc, pageWidth - margin.right - 41, pillY, 18, 10, 'Vistas', `${totalVistasConAcceso}`, [241, 245, 249], [30, 41, 59]);
            this.dibujarPillMetrica(doc, pageWidth - margin.right - 20, pillY, 18, 10, 'Permisos', `${totalPermisosConcedidos}`, [220, 252, 231], [22, 101, 52]);

            y += 24;
        };

        const dibujarEncabezadoPaginaSiguiente = () => {
            y = margin.top;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin.left, y + 8, pageWidth - margin.right, y + 8);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`JR INGENIERÍA ELÉCTRICA • CÉDULA DE AUTORIZACIONES: ${nombreRol.toUpperCase()}`, margin.left, y + 5.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(`Rol #${rolId} • Sistema ERP / CRM`, pageWidth - margin.right, y + 5.5, { align: 'right' });

            y += 12;
        };

        const dibujarCabeceraTabla = () => {
            doc.setFillColor(241, 245, 249); // slate-100
            doc.rect(margin.left, y, contentWidth, 6, 'F');
            doc.setDrawColor(203, 213, 225); // slate-300
            doc.setLineWidth(0.2);
            doc.line(margin.left, y + 6, margin.left + contentWidth, y + 6);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(51, 65, 85); // slate-700
            doc.text('PANTALLA / VISTA', margin.left + 3, y + 4.2);
            doc.text('GRUPO / MENÚ', margin.left + 60, y + 4.2);
            doc.text('NIVEL DE ACCESO', margin.left + 97, y + 4.2);
            doc.text('PRIVILEGIOS AUTORIZADOS', margin.left + 132, y + 4.2);

            y += 6.5;
        };

        // =========================================================================
        // GENERACIÓN DEL CONTENIDO
        // =========================================================================
        dibujarEncabezadoPagina1();

        let hayVistasMostradas = false;

        for (const modulo of modulosFiltrados) {
            const vistas = modulo.vistas;
            const vistasAMostrar = soloConAcceso
                ? vistas.filter((v) => (seleccion[v.id]?.length ?? 0) > 0)
                : vistas;

            if (soloConAcceso && vistasAMostrar.length === 0) {
                continue;
            }

            hayVistasMostradas = true;

            // Asegurar espacio para la barra del módulo + cabecera de tabla + primera fila
            checkSpace(22);

            // Barra del Módulo
            doc.setFillColor(3, 105, 161); // sky-700
            doc.roundedRect(margin.left, y, contentWidth, 6.5, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text(
                `MÓDULO: ${modulo.titulo.toUpperCase()}  (${vistasAMostrar.length} ${vistasAMostrar.length === 1 ? 'vista' : 'vistas'})`,
                margin.left + 4,
                y + 4.5
            );
            y += 7.5;

            dibujarCabeceraTabla();

            // Filas de Vistas
            let rowIndex = 0;
            for (const vista of vistasAMostrar) {
                const permisosIds = seleccion[vista.id] ?? [];
                const tieneAcceso = permisosIds.length > 0;

                // Nombres legibles de permisos
                const nombresPermisos = permisosIds.map((pId) => {
                    const obj = catalogo.find((c) => c.permisoId === pId);
                    return obj ? etiquetaPermiso(vista.id, obj) : `P#${pId}`;
                });

                // Nivel de Acceso y Badge
                const nivel = this.determinarNivelAcceso(permisosIds, nombresPermisos);

                // Cálculo de altura de fila según contenido
                const textoPermisos = tieneAcceso ? nombresPermisos.join(', ') : 'Sin acceso asignado';
                const lineasTitulo = doc.splitTextToSize(vista.titulo, 54);
                const lineasPermisos = doc.splitTextToSize(textoPermisos, 46);
                const maxLineas = Math.max(lineasTitulo.length, lineasPermisos.length, 1);
                const rowHeight = Math.max(6.8, maxLineas * 3.8 + 2.5);

                // Verificar salto de página
                checkSpace(rowHeight, () => {
                    // Si saltó de página, redibujar la cabecera de la tabla
                    doc.setFillColor(3, 105, 161);
                    doc.roundedRect(margin.left, y, contentWidth, 5.5, 1, 1, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7.5);
                    doc.setTextColor(255, 255, 255);
                    doc.text(`MÓDULO: ${modulo.titulo.toUpperCase()} (Continuación)`, margin.left + 4, y + 4);
                    y += 6.5;
                    dibujarCabeceraTabla();
                });

                // Fondo de fila alternada
                if (rowIndex % 2 === 1) {
                    doc.setFillColor(248, 250, 252); // slate-50
                    doc.rect(margin.left, y, contentWidth, rowHeight, 'F');
                }

                // Línea divisoria
                doc.setDrawColor(241, 245, 249);
                doc.setLineWidth(0.15);
                doc.line(margin.left, y + rowHeight, margin.left + contentWidth, y + rowHeight);

                // Columna 1: Vista / Pantalla
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.2);
                doc.setTextColor(30, 41, 59);
                doc.text(lineasTitulo, margin.left + 3, y + 3.8);

                // Identificador técnico de la vista en subtexto
                if (lineasTitulo.length === 1 && rowHeight >= 7.5) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(5.8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(vista.id, margin.left + 3, y + 6.8);
                }

                // Columna 2: Grupo / Subcarpeta
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.8);
                doc.setTextColor(71, 85, 105);
                const grupoTexto = vista.grupo || 'Principal';
                const lineasGrupo = doc.splitTextToSize(grupoTexto, 32);
                doc.text(lineasGrupo, margin.left + 60, y + 3.8);

                // Columna 3: Nivel de Acceso (Badge estilizado)
                this.dibujarBadgeNivel(doc, margin.left + 97, y + 1.8, nivel);

                // Columna 4: Privilegios Autorizados
                doc.setFont('helvetica', tieneAcceso ? 'bold' : 'italic');
                doc.setFontSize(6.8);
                doc.setTextColor(tieneAcceso ? 15 : 148, tieneAcceso ? 23 : 163, tieneAcceso ? 42 : 184);
                doc.text(lineasPermisos, margin.left + 132, y + 3.8);

                y += rowHeight;
                rowIndex++;
            }

            y += 3.5; // Espacio entre módulos
        }

        if (!hayVistasMostradas) {
            checkSpace(18);
            doc.setFillColor(254, 242, 242); // red-50
            doc.setDrawColor(254, 202, 202); // red-200
            doc.roundedRect(margin.left, y, contentWidth, 14, 1.5, 1.5, 'FD');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(153, 27, 27); // red-800
            doc.text('Este rol no cuenta con vistas ni permisos autorizados asignados en los módulos evaluados.', margin.left + 5, y + 8);
            y += 18;
        }

        // =========================================================================
        // RESUMEN DE MÓDULOS RESTRINGIDOS (SIN ACCESO)
        // =========================================================================
        if (soloConAcceso && modulosSinAccesoNombres.length > 0 && !moduloIdFiltro) {
            checkSpace(16);
            doc.setFillColor(241, 245, 249); // slate-100
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(margin.left, y, contentWidth, 13, 1.5, 1.5, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(71, 85, 105);
            doc.text('MÓDULOS RESTRINGIDOS (SIN PRIVILEGIOS ASIGNADOS EN ESTE ROL):', margin.left + 4, y + 5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(100, 116, 139);
            const textoRestringidos = modulosSinAccesoNombres.join(' • ');
            const lineasRestringidos = doc.splitTextToSize(textoRestringidos, contentWidth - 8);
            doc.text(lineasRestringidos, margin.left + 4, y + 9.5);

            y += 16;
        }

        // =========================================================================
        // FIRMAS DE CONTROL Y AUDITORÍA
        // =========================================================================
        if (incluirFirmas) {
            checkSpace(28);
            this.dibujarBloqueFirmas(doc, margin.left, y, contentWidth);
            y += 28;
        }

        // =========================================================================
        // NUMERACIÓN DE PÁGINAS Y PIE DE PÁGINA EN TODAS LAS HOJAS
        // =========================================================================
        const totalPaginas = doc.getNumberOfPages();
        for (let p = 1; p <= totalPaginas; p++) {
            doc.setPage(p);
            this.dibujarPiePagina(doc, p, totalPaginas, pageWidth, pageHeight, margin);
        }

        // Descarga directa del archivo PDF
        const nombreArchivo = `Cedula_Autorizaciones_${nombreRol.replace(/[^a-zA-Z0-9_-]/g, '_')}_${this.formatearFechaArchivo(new Date())}.pdf`;
        doc.save(nombreArchivo);
    }

    /**
     * Genera y descarga una Matriz Consolidada de Autorizaciones en PDF para todos los roles del sistema.
     */
    exportarMatrizTodosRolesPdf(
        roles: any[],
        modulos: ModuloRol[],
        catalogo: PermisoCatalogo[],
        opciones: OpcionesExportacionPdf = {}
    ): void {
        const moduloIdFiltro = opciones.moduloId ?? null;
        const incluirFirmas = opciones.incluirFirmas ?? true;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = { left: 14, right: 14, top: 14, bottom: 18 };
        const contentWidth = pageWidth - margin.left - margin.right;

        let y = margin.top;

        const checkSpace = (needed: number, onNewPage?: () => void) => {
            if (y + needed > pageHeight - margin.bottom) {
                doc.addPage();
                dibujarEncabezadoMatrizPaginaSiguiente();
                if (onNewPage) {
                    onNewPage();
                }
            }
        };

        const dibujarEncabezadoMatrizPagina1 = () => {
            doc.setFillColor(15, 23, 42); // slate-900
            doc.roundedRect(margin.left, y, contentWidth, 23, 2, 2, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12.5);
            doc.text('JR INGENIERÍA ELÉCTRICA S.A. DE C.V.', margin.left + 6, y + 7.5);

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text('SISTEMA INTEGRAL ERP / CRM • CONTROL DE ACCESOS Y SEGURIDAD', margin.left + 6, y + 13.5);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(56, 189, 248);
            doc.text('MATRIZ GENERAL DE AUTORIZACIONES Y PERMISOS POR ROL', margin.left + 6, y + 18.5);

            const fechaStr = this.formatearFecha(new Date());
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(226, 232, 240);
            doc.text(`Emisión: ${fechaStr}`, pageWidth - margin.right - 6, y + 7.5, { align: 'right' });
            doc.text(`Roles Registrados: ${roles.length}`, pageWidth - margin.right - 6, y + 13, { align: 'right' });
            doc.text('Auditoría General SGC', pageWidth - margin.right - 6, y + 18.5, { align: 'right' });

            y += 27;

            // Tabla Resumen Ejecutivo de Roles
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(margin.left, y, contentWidth, 8, 1.5, 1.5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text('RESUMEN EJECUTIVO DE ROLES Y PRIVILEGIOS ASIGNADOS', margin.left + 4, y + 5.5);
            y += 10;

            // Cabecera Resumen
            doc.setFillColor(241, 245, 249);
            doc.rect(margin.left, y, contentWidth, 5.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(51, 65, 85);
            doc.text('ID', margin.left + 3, y + 3.8);
            doc.text('NOMBRE DEL ROL', margin.left + 16, y + 3.8);
            doc.text('MÓDULOS AUTORIZADOS', margin.left + 85, y + 3.8);
            doc.text('VISTAS ACTIVAS', margin.left + 128, y + 3.8);
            doc.text('TOTAL PERMISOS', margin.left + 158, y + 3.8);
            y += 6;

            roles.forEach((r, idx) => {
                checkSpace(5.5);
                const sel = seleccionDeRol(r);
                let modulosActivosCount = 0;
                let vistasActivasCount = 0;
                let permisosCount = 0;

                for (const m of modulos) {
                    const activas = m.vistas.filter((v) => (sel[v.id]?.length ?? 0) > 0);
                    if (activas.length > 0) {
                        modulosActivosCount++;
                        vistasActivasCount += activas.length;
                        activas.forEach((v) => { permisosCount += sel[v.id].length; });
                    }
                }

                if (idx % 2 === 1) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(margin.left, y, contentWidth, 5.2, 'F');
                }

                doc.setDrawColor(241, 245, 249);
                doc.setLineWidth(0.15);
                doc.line(margin.left, y + 5.2, margin.left + contentWidth, y + 5.2);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.8);
                doc.setTextColor(71, 85, 105);
                doc.text(`#${r.rolId}`, margin.left + 3, y + 3.7);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(r.nombreRol || 'Rol sin nombre', margin.left + 16, y + 3.7);

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(`${modulosActivosCount} módulos`, margin.left + 85, y + 3.7);
                doc.text(`${vistasActivasCount} vistas`, margin.left + 128, y + 3.7);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(permisosCount > 0 ? 3 : 148, permisosCount > 0 ? 105 : 163, permisosCount > 0 ? 161 : 184);
                doc.text(`${permisosCount} privilegios`, margin.left + 158, y + 3.7);

                y += 5.5;
            });

            y += 6;
        };

        const dibujarEncabezadoMatrizPaginaSiguiente = () => {
            y = margin.top;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin.left, y + 8, pageWidth - margin.right, y + 8);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text('JR INGENIERÍA ELÉCTRICA • MATRIZ GENERAL DE AUTORIZACIONES POR ROL', margin.left, y + 5.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('Seguridad de la Información • ERP / CRM', pageWidth - margin.right, y + 5.5, { align: 'right' });

            y += 12;
        };

        dibujarEncabezadoMatrizPagina1();

        // Desglose detallado por cada rol
        for (const r of roles) {
            const sel = seleccionDeRol(r);
            const vistasTotal = Object.keys(sel).filter((k) => (sel[k]?.length ?? 0) > 0).length;

            checkSpace(18);

            // Título de sección del rol
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(margin.left, y, contentWidth, 6.5, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            doc.text(`ROL: ${(r.nombreRol || 'Sin Nombre').toUpperCase()} (ID #${r.rolId})`, margin.left + 4, y + 4.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`${vistasTotal} vistas autorizadas`, pageWidth - margin.right - 4, y + 4.5, { align: 'right' });
            y += 8;

            if (vistasTotal === 0) {
                checkSpace(8);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text('Este rol no tiene vistas ni permisos asignados actualmente.', margin.left + 4, y + 4);
                y += 8;
                continue;
            }

            // Módulos con acceso en este rol
            let modulosEval = modulos;
            if (moduloIdFiltro) {
                modulosEval = modulos.filter((m) => m.id === moduloIdFiltro);
            }

            for (const m of modulosEval) {
                const vistasActivas = m.vistas.filter((v) => (sel[v.id]?.length ?? 0) > 0);
                if (vistasActivas.length === 0) continue;

                checkSpace(12);

                doc.setFillColor(241, 245, 249);
                doc.rect(margin.left, y, contentWidth, 5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.2);
                doc.setTextColor(3, 105, 161);
                doc.text(`Módulo: ${m.titulo} (${vistasActivas.length} pantallas)`, margin.left + 3, y + 3.5);
                y += 5.5;

                for (const v of vistasActivas) {
                    const pIds = sel[v.id] ?? [];
                    const nombres = pIds.map((pId) => {
                        const obj = catalogo.find((c) => c.permisoId === pId);
                        return obj ? etiquetaPermiso(v.id, obj) : `P#${pId}`;
                    });

                    const nivel = this.determinarNivelAcceso(pIds, nombres);
                    const lineasPermisos = doc.splitTextToSize(nombres.join(', '), 60);
                    const rowH = Math.max(5.5, lineasPermisos.length * 3.2 + 2);

                    checkSpace(rowH);

                    doc.setDrawColor(241, 245, 249);
                    doc.setLineWidth(0.1);
                    doc.line(margin.left, y + rowH, margin.left + contentWidth, y + rowH);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.8);
                    doc.setTextColor(30, 41, 59);
                    doc.text(v.titulo, margin.left + 4, y + 3.5);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6.2);
                    doc.setTextColor(100, 116, 139);
                    doc.text(v.grupo || 'Principal', margin.left + 65, y + 3.5);

                    this.dibujarBadgeNivel(doc, margin.left + 95, y + 1.2, nivel);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.5);
                    doc.setTextColor(15, 23, 42);
                    doc.text(lineasPermisos, margin.left + 125, y + 3.5);

                    y += rowH;
                }
                y += 2.5;
            }
            y += 4;
        }

        if (incluirFirmas) {
            checkSpace(28);
            this.dibujarBloqueFirmas(doc, margin.left, y, contentWidth);
            y += 28;
        }

        const totalPaginas = doc.getNumberOfPages();
        for (let p = 1; p <= totalPaginas; p++) {
            doc.setPage(p);
            this.dibujarPiePagina(doc, p, totalPaginas, pageWidth, pageHeight, margin);
        }

        const nombreArchivo = `Matriz_Autorizaciones_Roles_${this.formatearFechaArchivo(new Date())}.pdf`;
        doc.save(nombreArchivo);
    }

    // =========================================================================
    // UTILIDADES PRIVADAS DE DIBUJO Y FORMATEO
    // =========================================================================

    private determinarNivelAcceso(
        permisosIds: number[],
        nombres: string[]
    ): { texto: string; fondo: [number, number, number]; textoColor: [number, number, number] } {
        if (!permisosIds || permisosIds.length === 0) {
            return { texto: 'Sin Acceso', fondo: [241, 245, 249], textoColor: [148, 163, 184] };
        }

        const tieneVer = permisosIds.includes(1);
        const tieneAgregar = permisosIds.includes(2) || permisosIds.includes(1002);
        const tieneEditar = permisosIds.includes(3) || permisosIds.includes(1004);
        const tieneEliminar = permisosIds.includes(4) || permisosIds.includes(1003);

        if (tieneVer && tieneAgregar && tieneEditar && tieneEliminar) {
            return { texto: 'Control Total', fondo: [220, 252, 231], textoColor: [22, 101, 52] }; // green
        }

        if (tieneVer && (tieneAgregar || tieneEditar)) {
            return { texto: 'Edición y Consulta', fondo: [224, 242, 254], textoColor: [3, 105, 161] }; // sky
        }

        if (tieneVer && permisosIds.length === 1) {
            return { texto: 'Solo Consulta', fondo: [241, 245, 249], textoColor: [51, 65, 85] }; // slate
        }

        return { texto: 'Personalizado', fondo: [254, 243, 199], textoColor: [180, 83, 9] }; // amber
    }

    private dibujarBadgeNivel(
        doc: jsPDF,
        x: number,
        y: number,
        nivel: { texto: string; fondo: [number, number, number]; textoColor: [number, number, number] }
    ): void {
        const width = 30;
        const height = 4.2;
        doc.setFillColor(nivel.fondo[0], nivel.fondo[1], nivel.fondo[2]);
        doc.roundedRect(x, y, width, height, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(nivel.textoColor[0], nivel.textoColor[1], nivel.textoColor[2]);
        doc.text(nivel.texto, x + width / 2, y + 3, { align: 'center' });
    }

    private dibujarPillMetrica(
        doc: jsPDF,
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
        valor: string,
        bg: [number, number, number],
        fg: [number, number, number]
    ): void {
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(fg[0], fg[1], fg[2]);
        doc.text(valor, x + w / 2, y + 4.8, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + w / 2, y + 8.5, { align: 'center' });
    }

    private dibujarBloqueFirmas(doc: jsPDF, x: number, y: number, w: number): void {
        const anchoFirma = (w - 16) / 3;
        const alto = 22;

        const firmas = [
            { titulo: 'Elaboró', rol: 'Administrador del Sistema', sub: 'Seguridad Informática' },
            { titulo: 'Revisó', rol: 'Control Interno / Calidad', sub: 'Auditoría SGC ISO 9001' },
            { titulo: 'Autorizó', rol: 'Dirección General / Titular', sub: 'JR Ingeniería Eléctrica' }
        ];

        firmas.forEach((f, i) => {
            const posX = x + i * (anchoFirma + 8);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.2);
            doc.roundedRect(posX, y, anchoFirma, alto, 1.5, 1.5, 'FD');

            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.3);
            doc.line(posX + 4, y + 13, posX + anchoFirma - 4, y + 13);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(71, 85, 105);
            doc.text(f.titulo, posX + anchoFirma / 2, y + 4, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(15, 23, 42);
            doc.text(f.rol, posX + anchoFirma / 2, y + 17, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(148, 163, 184);
            doc.text(f.sub, posX + anchoFirma / 2, y + 20, { align: 'center' });
        });
    }

    private dibujarPiePagina(
        doc: jsPDF,
        pagina: number,
        totalPaginas: number,
        pageWidth: number,
        pageHeight: number,
        margin: { left: number; right: number; bottom: number }
    ): void {
        const yFooter = pageHeight - 9;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin.left, yFooter - 3, pageWidth - margin.right, yFooter - 3);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(148, 163, 184);
        doc.text(
            'JR INGENIERÍA ELÉCTRICA S.A. DE C.V. • CONTROL DE SEGURIDAD Y PRIVILEGIOS • DOCUMENTO OFICIAL CONFIDENCIAL',
            margin.left,
            yFooter
        );

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Página ${pagina} de ${totalPaginas}`, pageWidth - margin.right, yFooter, { align: 'right' });
    }

    private formatearFecha(d: Date): string {
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const dia = d.getDate();
        const mes = meses[d.getMonth()];
        const anio = d.getFullYear();
        const hora = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        return `${dia}/${mes}/${anio} ${hora}:${min} hrs`;
    }

    private formatearFechaArchivo(d: Date): string {
        const yyyy = d.getFullYear();
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        return `${yyyy}${mm}${dd}`;
    }
}

