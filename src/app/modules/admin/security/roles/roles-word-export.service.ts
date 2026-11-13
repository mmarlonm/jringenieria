import { Injectable } from '@angular/core';
import {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    Packer,
    PageNumber,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import {
    ModuloRol,
    PermisoCatalogo,
    Seleccion,
    VistaRol,
    etiquetaPermiso,
    seleccionDeRol,
} from './roles-permisos.utils';

export interface OpcionesExportacionWord {
    soloConAcceso?: boolean;
    moduloId?: string | null;
    seleccionOverride?: Seleccion;
    incluirFirmas?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RolesWordExportService {

    constructor() {}

    /**
     * Genera y descarga la Cédula Oficial de Autorizaciones y Permisos en formato Microsoft Word (.docx).
     */
    async exportarRolWord(
        rol: any,
        modulos: ModuloRol[],
        catalogo: PermisoCatalogo[],
        opciones: OpcionesExportacionWord = {}
    ): Promise<void> {
        const soloConAcceso = opciones.soloConAcceso ?? true;
        const moduloIdFiltro = opciones.moduloId ?? null;
        const incluirFirmas = opciones.incluirFirmas ?? true;

        const seleccion: Seleccion = opciones.seleccionOverride ?? seleccionDeRol(rol);
        const nombreRol = (rol?.nombreRol || (rol?.rolId === 0 ? 'Rol Nuevo' : 'Sin Nombre')).trim();
        const rolId = rol?.rolId ?? 0;

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

        const fechaFormateada = this.formatearFecha(new Date());
        const children: (Paragraph | Table)[] = [];

        // 1. TÍTULO INSTITUCIONAL
        children.push(
            new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                    new TextRun({
                        text: 'JR INGENIERÍA ELÉCTRICA S.A. DE C.V.',
                        bold: true,
                        size: 30, // 15 pt
                        color: '0F172A',
                        font: 'Calibri'
                    })
                ]
            }),
            new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                    new TextRun({
                        text: 'CÉDULA OFICIAL DE AUTORIZACIONES Y PERMISOS POR MÓDULO',
                        bold: true,
                        size: 22, // 11 pt
                        color: '0284C7',
                        font: 'Calibri'
                    })
                ]
            }),
            new Paragraph({
                spacing: { before: 0, after: 200 },
                children: [
                    new TextRun({
                        text: 'Sistema Integral ERP / CRM • Control de Seguridad de la Información y Gestión de Accesos',
                        size: 18, // 9 pt
                        color: '64748B',
                        font: 'Calibri',
                        italics: true
                    })
                ]
            })
        );

        // 2. TARJETA INFORMATIVA DEL ROL (Tabla de Metadatos)
        const cellBorderLight = {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' }
        };

        const metadataTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            rows: [
                new TableRow({
                    cantSplit: true,
                    children: [
                        new TableCell({
                            width: { size: 55, type: WidthType.PERCENTAGE },
                            borders: cellBorderLight,
                            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: 'ROL: ', bold: true, size: 18, color: '0F172A', font: 'Calibri' }),
                                        new TextRun({ text: nombreRol.toUpperCase(), bold: true, size: 20, color: '0284C7', font: 'Calibri' })
                                    ]
                                }),
                                new Paragraph({
                                    spacing: { before: 40, after: 0 },
                                    children: [
                                        new TextRun({ text: `ID Interno: Rol #${rolId}   •   Estatus: `, size: 16, color: '475569', font: 'Calibri' }),
                                        new TextRun({ text: 'OFICIAL / AUDITABLE', bold: true, size: 16, color: '16A34A', font: 'Calibri' })
                                    ]
                                })
                            ]
                        }),
                        new TableCell({
                            width: { size: 45, type: WidthType.PERCENTAGE },
                            borders: cellBorderLight,
                            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                        new TextRun({ text: 'Fecha de Emisión: ', bold: true, size: 16, color: '475569', font: 'Calibri' }),
                                        new TextRun({ text: fechaFormateada, size: 16, color: '0F172A', font: 'Calibri' })
                                    ]
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    spacing: { before: 40, after: 0 },
                                    children: [
                                        new TextRun({ text: `Código: SEC-AUT-R${rolId}`, size: 16, color: '64748B', font: 'Calibri' })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                new TableRow({
                    cantSplit: true,
                    children: [
                        new TableCell({
                            columnSpan: 2,
                            borders: cellBorderLight,
                            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({ text: 'Resumen de Privilegios: ', bold: true, size: 16, color: '334155', font: 'Calibri' }),
                                        new TextRun({ text: `${modulosConAccesoSet.size} módulos autorizados   |   `, size: 16, color: '0284C7', bold: true, font: 'Calibri' }),
                                        new TextRun({ text: `${totalVistasConAcceso} pantallas activas   |   `, size: 16, color: '0F172A', bold: true, font: 'Calibri' }),
                                        new TextRun({ text: `${totalPermisosConcedidos} privilegios asignados`, size: 16, color: '16A34A', bold: true, font: 'Calibri' })
                                    ]
                                })
                            ]
                        })
                    ]
                })
            ]
        });

        children.push(metadataTable);
        children.push(new Paragraph({ spacing: { before: 180, after: 0 }, children: [] }));

        // 3. DESGLOSE POR MÓDULO
        let hayVistas = false;
        const borderFila = {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
        };

        for (const modulo of modulosFiltrados) {
            const vistasAMostrar = soloConAcceso
                ? modulo.vistas.filter((v) => (seleccion[v.id]?.length ?? 0) > 0)
                : modulo.vistas;

            if (soloConAcceso && vistasAMostrar.length === 0) {
                continue;
            }

            hayVistas = true;

            // Barra de Título del Módulo
            const barraModulo = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 140, right: 140 },
                rows: [
                    new TableRow({
                        cantSplit: true,
                        children: [
                            new TableCell({
                                borders: {
                                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
                                },
                                shading: { fill: '0369A1', type: ShadingType.CLEAR },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `MÓDULO: ${modulo.titulo.toUpperCase()} (${vistasAMostrar.length} ${vistasAMostrar.length === 1 ? 'pantalla autorizada' : 'pantallas autorizadas'})`,
                                                bold: true,
                                                size: 18, // 9 pt
                                                color: 'FFFFFF',
                                                font: 'Calibri'
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });
            children.push(barraModulo);

            // Tabla de Vistas del Módulo
            const tableRows: TableRow[] = [];

            // Cabecera de la tabla
            tableRows.push(
                new TableRow({
                    tableHeader: true,
                    cantSplit: true,
                    children: [
                        new TableCell({
                            width: { size: 32, type: WidthType.PERCENTAGE },
                            borders: borderFila,
                            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                            children: [new Paragraph({ children: [new TextRun({ text: 'PANTALLA / VISTA', bold: true, size: 15, color: '334155', font: 'Calibri' })] })]
                        }),
                        new TableCell({
                            width: { size: 20, type: WidthType.PERCENTAGE },
                            borders: borderFila,
                            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                            children: [new Paragraph({ children: [new TextRun({ text: 'SUBMENÚ / GRUPO', bold: true, size: 15, color: '334155', font: 'Calibri' })] })]
                        }),
                        new TableCell({
                            width: { size: 20, type: WidthType.PERCENTAGE },
                            borders: borderFila,
                            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                            children: [new Paragraph({ children: [new TextRun({ text: 'NIVEL DE ACCESO', bold: true, size: 15, color: '334155', font: 'Calibri' })] })]
                        }),
                        new TableCell({
                            width: { size: 28, type: WidthType.PERCENTAGE },
                            borders: borderFila,
                            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                            children: [new Paragraph({ children: [new TextRun({ text: 'PRIVILEGIOS AUTORIZADOS', bold: true, size: 15, color: '334155', font: 'Calibri' })] })]
                        })
                    ]
                })
            );

            // Filas de datos
            vistasAMostrar.forEach((v, idx) => {
                const permisosIds = seleccion[v.id] ?? [];
                const tieneAcceso = permisosIds.length > 0;
                const nombresPermisos = permisosIds.map((pId) => {
                    const obj = catalogo.find((c) => c.permisoId === pId);
                    return obj ? etiquetaPermiso(v.id, obj) : `P#${pId}`;
                });

                const nivel = this.determinarNivelAcceso(permisosIds);
                const bgFila = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';

                tableRows.push(
                    new TableRow({
                        cantSplit: true,
                        children: [
                            new TableCell({
                                width: { size: 32, type: WidthType.PERCENTAGE },
                                borders: borderFila,
                                shading: { fill: bgFila, type: ShadingType.CLEAR },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: v.titulo, bold: true, size: 16, color: '0F172A', font: 'Calibri' })
                                        ]
                                    }),
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: v.id, size: 13, color: '94A3B8', font: 'Calibri' })
                                        ]
                                    })
                                ]
                            }),
                            new TableCell({
                                width: { size: 20, type: WidthType.PERCENTAGE },
                                borders: borderFila,
                                shading: { fill: bgFila, type: ShadingType.CLEAR },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: v.grupo || 'Principal', size: 15, color: '475569', font: 'Calibri' })
                                        ]
                                    })
                                ]
                            }),
                            new TableCell({
                                width: { size: 20, type: WidthType.PERCENTAGE },
                                borders: borderFila,
                                shading: { fill: bgFila, type: ShadingType.CLEAR },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: nivel.texto,
                                                bold: true,
                                                size: 15,
                                                color: nivel.colorHex,
                                                font: 'Calibri'
                                            })
                                        ]
                                    })
                                ]
                            }),
                            new TableCell({
                                width: { size: 28, type: WidthType.PERCENTAGE },
                                borders: borderFila,
                                shading: { fill: bgFila, type: ShadingType.CLEAR },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: tieneAcceso ? nombresPermisos.join(', ') : 'Sin acceso asignado',
                                                bold: tieneAcceso,
                                                italics: !tieneAcceso,
                                                size: 15,
                                                color: tieneAcceso ? '0F172A' : '94A3B8',
                                                font: 'Calibri'
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                );
            });

            const tablaModulo = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                rows: tableRows
            });

            children.push(tablaModulo);
            children.push(new Paragraph({ spacing: { before: 140, after: 0 }, children: [] }));
        }

        if (!hayVistas) {
            children.push(
                new Paragraph({
                    spacing: { before: 120, after: 120 },
                    children: [
                        new TextRun({
                            text: 'Este rol no cuenta con vistas ni permisos autorizados asignados en los módulos evaluados.',
                            italics: true,
                            size: 18,
                            color: 'DC2626',
                            font: 'Calibri'
                        })
                    ]
                })
            );
        }

        // 4. MÓDULOS RESTRINGIDOS
        if (soloConAcceso && modulosSinAccesoNombres.length > 0 && !moduloIdFiltro) {
            const calloutRestringidos = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
                rows: [
                    new TableRow({
                        cantSplit: true,
                        children: [
                            new TableCell({
                                borders: {
                                    top: { style: BorderStyle.SINGLE, size: 1, color: 'FECDD3' },
                                    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'FECDD3' },
                                    left: { style: BorderStyle.SINGLE, size: 2, color: 'E11D48' },
                                    right: { style: BorderStyle.SINGLE, size: 1, color: 'FECDD3' }
                                },
                                shading: { fill: 'FFF1F2', type: ShadingType.CLEAR },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: 'MÓDULOS RESTRINGIDOS (SIN PRIVILEGIOS ASIGNADOS EN ESTE ROL):',
                                                bold: true,
                                                size: 16,
                                                color: '9F1239',
                                                font: 'Calibri'
                                            })
                                        ]
                                    }),
                                    new Paragraph({
                                        spacing: { before: 40, after: 0 },
                                        children: [
                                            new TextRun({
                                                text: modulosSinAccesoNombres.join('   •   '),
                                                size: 15,
                                                color: '475569',
                                                font: 'Calibri'
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });
            children.push(calloutRestringidos);
            children.push(new Paragraph({ spacing: { before: 180, after: 0 }, children: [] }));
        }

        // 5. BLOQUE DE FIRMAS
        if (incluirFirmas) {
            const tablaFirmas = this.construirTablaFirmas();
            children.push(tablaFirmas);
        }

        // 6. ENSAMBLAR DOCUMENTO WORD
        const doc = new Document({
            sections: [
                {
                    properties: {
                        page: {
                            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 pulgada
                        }
                    },
                    headers: {
                        default: new Header({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                        new TextRun({
                                            text: `JR INGENIERÍA ELÉCTRICA • CÉDULA DE AUTORIZACIONES: ${nombreRol.toUpperCase()}`,
                                            size: 16,
                                            color: '64748B',
                                            font: 'Calibri'
                                        })
                                    ]
                                })
                            ]
                        })
                    },
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: 'JR INGENIERÍA ELÉCTRICA S.A. DE C.V. • CONTROL DE SEGURIDAD Y PRIVILEGIOS • CONFIDENCIAL',
                                            size: 15,
                                            color: '94A3B8',
                                            font: 'Calibri'
                                        })
                                    ]
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                        new TextRun({ text: 'Página ', size: 15, color: '64748B', font: 'Calibri' }),
                                        new TextRun({ children: [PageNumber.CURRENT], size: 15, bold: true, color: '64748B', font: 'Calibri' }),
                                        new TextRun({ text: ' de ', size: 15, color: '64748B', font: 'Calibri' }),
                                        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, bold: true, color: '64748B', font: 'Calibri' })
                                    ]
                                })
                            ]
                        })
                    },
                    children
                }
            ]
        });

        // Empaquetar y descargar
        const blob = await Packer.toBlob(doc);
        const nombreArchivo = `Cedula_Autorizaciones_${nombreRol.replace(/[^a-zA-Z0-9_-]/g, '_')}_${this.formatearFechaArchivo(new Date())}.docx`;
        saveAs(blob, nombreArchivo);
    }

    /**
     * Genera y descarga una Matriz General de Autorizaciones en Microsoft Word (.docx) para todos los roles del sistema.
     */
    async exportarMatrizTodosRolesWord(
        roles: any[],
        modulos: ModuloRol[],
        catalogo: PermisoCatalogo[],
        opciones: OpcionesExportacionWord = {}
    ): Promise<void> {
        const moduloIdFiltro = opciones.moduloId ?? null;
        const incluirFirmas = opciones.incluirFirmas ?? true;

        const fechaFormateada = this.formatearFecha(new Date());
        const children: (Paragraph | Table)[] = [];

        // 1. TÍTULO GENERAL
        children.push(
            new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                    new TextRun({
                        text: 'JR INGENIERÍA ELÉCTRICA S.A. DE C.V.',
                        bold: true,
                        size: 30,
                        color: '0F172A',
                        font: 'Calibri'
                    })
                ]
            }),
            new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                    new TextRun({
                        text: 'MATRIZ GENERAL DE AUTORIZACIONES Y PERMISOS POR ROL',
                        bold: true,
                        size: 22,
                        color: '0284C7',
                        font: 'Calibri'
                    })
                ]
            }),
            new Paragraph({
                spacing: { before: 0, after: 180 },
                children: [
                    new TextRun({
                        text: `Fecha de Emisión: ${fechaFormateada}   •   Total de Roles: ${roles.length}   •   Auditoría General SGC ISO 9001`,
                        size: 17,
                        color: '64748B',
                        font: 'Calibri',
                        italics: true
                    })
                ]
            })
        );

        // 2. TABLA RESUMEN DE ROLES
        const borderFila = {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
        };

        const rowsResumen: TableRow[] = [
            new TableRow({
                tableHeader: true,
                cantSplit: true,
                children: [
                    new TableCell({
                        width: { size: 12, type: WidthType.PERCENTAGE },
                        borders: borderFila,
                        shading: { fill: '0F172A', type: ShadingType.CLEAR },
                        children: [new Paragraph({ children: [new TextRun({ text: 'ID', bold: true, size: 16, color: 'FFFFFF', font: 'Calibri' })] })]
                    }),
                    new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        borders: borderFila,
                        shading: { fill: '0F172A', type: ShadingType.CLEAR },
                        children: [new Paragraph({ children: [new TextRun({ text: 'NOMBRE DEL ROL', bold: true, size: 16, color: 'FFFFFF', font: 'Calibri' })] })]
                    }),
                    new TableCell({
                        width: { size: 24, type: WidthType.PERCENTAGE },
                        borders: borderFila,
                        shading: { fill: '0F172A', type: ShadingType.CLEAR },
                        children: [new Paragraph({ children: [new TextRun({ text: 'MÓDULOS ACTIVOS', bold: true, size: 16, color: 'FFFFFF', font: 'Calibri' })] })]
                    }),
                    new TableCell({
                        width: { size: 24, type: WidthType.PERCENTAGE },
                        borders: borderFila,
                        shading: { fill: '0F172A', type: ShadingType.CLEAR },
                        children: [new Paragraph({ children: [new TextRun({ text: 'VISTAS AUTORIZADAS', bold: true, size: 16, color: 'FFFFFF', font: 'Calibri' })] })]
                    })
                ]
            })
        ];

        roles.forEach((r, idx) => {
            const sel = seleccionDeRol(r);
            let modulosCount = 0;
            let vistasCount = 0;
            for (const m of modulos) {
                const act = m.vistas.filter((v) => (sel[v.id]?.length ?? 0) > 0);
                if (act.length > 0) {
                    modulosCount++;
                    vistasCount += act.length;
                }
            }

            const bgFila = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
            rowsResumen.push(
                new TableRow({
                    cantSplit: true,
                    children: [
                        new TableCell({
                            borders: borderFila,
                            shading: { fill: bgFila, type: ShadingType.CLEAR },
                            children: [new Paragraph({ children: [new TextRun({ text: `#${r.rolId}`, size: 16, color: '64748B', font: 'Calibri' })] })]
                        }),
                        new TableCell({
                            borders: borderFila,
                            shading: { fill: bgFila, type: ShadingType.CLEAR },
                            children: [new Paragraph({ children: [new TextRun({ text: r.nombreRol || 'Sin nombre', bold: true, size: 16, color: '0F172A', font: 'Calibri' })] })]
                        }),
                        new TableCell({
                            borders: borderFila,
                            shading: { fill: bgFila, type: ShadingType.CLEAR },
                            children: [new Paragraph({ children: [new TextRun({ text: `${modulosCount} módulos`, size: 16, color: '0284C7', font: 'Calibri' })] })]
                        }),
                        new TableCell({
                            borders: borderFila,
                            shading: { fill: bgFila, type: ShadingType.CLEAR },
                            children: [new Paragraph({ children: [new TextRun({ text: `${vistasCount} pantallas`, bold: true, size: 16, color: '16A34A', font: 'Calibri' })] })]
                        })
                    ]
                })
            );
        });

        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsResumen }));
        children.push(new Paragraph({ spacing: { before: 240, after: 0 }, children: [] }));

        // 3. DESGLOSE DETALLADO POR CADA ROL
        for (const r of roles) {
            const sel = seleccionDeRol(r);
            const vistasTotal = Object.keys(sel).filter((k) => (sel[k]?.length ?? 0) > 0).length;

            // Encabezado del rol
            children.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    margins: { top: 80, bottom: 80, left: 140, right: 140 },
                    rows: [
                        new TableRow({
                            cantSplit: true,
                            children: [
                                new TableCell({
                                    shading: { fill: '0F172A', type: ShadingType.CLEAR },
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({
                                                    text: `ROL: ${(r.nombreRol || 'Sin Nombre').toUpperCase()} (ID #${r.rolId})  —  ${vistasTotal} vistas autorizadas`,
                                                    bold: true,
                                                    size: 18,
                                                    color: 'FFFFFF',
                                                    font: 'Calibri'
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                })
            );

            if (vistasTotal === 0) {
                children.push(
                    new Paragraph({
                        spacing: { before: 60, after: 140 },
                        children: [
                            new TextRun({
                                text: 'Este rol no tiene vistas ni permisos asignados actualmente.',
                                italics: true,
                                size: 16,
                                color: '94A3B8',
                                font: 'Calibri'
                            })
                        ]
                    })
                );
                continue;
            }

            let modulosEval = modulos;
            if (moduloIdFiltro) {
                modulosEval = modulos.filter((m) => m.id === moduloIdFiltro);
            }

            for (const m of modulosEval) {
                const vistasActivas = m.vistas.filter((v) => (sel[v.id]?.length ?? 0) > 0);
                if (vistasActivas.length === 0) continue;

                const rowsModulo: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        cantSplit: true,
                        children: [
                            new TableCell({
                                columnSpan: 3,
                                borders: borderFila,
                                shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `Módulo: ${m.titulo} (${vistasActivas.length} pantallas)`,
                                                bold: true,
                                                size: 16,
                                                color: '0369A1',
                                                font: 'Calibri'
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ];

                vistasActivas.forEach((v) => {
                    const pIds = sel[v.id] ?? [];
                    const nombres = pIds.map((pId) => {
                        const obj = catalogo.find((c) => c.permisoId === pId);
                        return obj ? etiquetaPermiso(v.id, obj) : `P#${pId}`;
                    });
                    const nivel = this.determinarNivelAcceso(pIds);

                    rowsModulo.push(
                        new TableRow({
                            cantSplit: true,
                            children: [
                                new TableCell({
                                    width: { size: 40, type: WidthType.PERCENTAGE },
                                    borders: borderFila,
                                    children: [new Paragraph({ children: [new TextRun({ text: v.titulo, bold: true, size: 15, color: '0F172A', font: 'Calibri' })] })]
                                }),
                                new TableCell({
                                    width: { size: 25, type: WidthType.PERCENTAGE },
                                    borders: borderFila,
                                    children: [new Paragraph({ children: [new TextRun({ text: nivel.texto, bold: true, size: 15, color: nivel.colorHex, font: 'Calibri' })] })]
                                }),
                                new TableCell({
                                    width: { size: 35, type: WidthType.PERCENTAGE },
                                    borders: borderFila,
                                    children: [new Paragraph({ children: [new TextRun({ text: nombres.join(', '), size: 15, color: '334155', font: 'Calibri' })] })]
                                })
                            ]
                        })
                    );
                });

                children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsModulo }));
                children.push(new Paragraph({ spacing: { before: 80, after: 0 }, children: [] }));
            }

            children.push(new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }));
        }

        if (incluirFirmas) {
            children.push(this.construirTablaFirmas());
        }

        const doc = new Document({
            sections: [
                {
                    properties: {
                        page: {
                            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                        }
                    },
                    headers: {
                        default: new Header({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                        new TextRun({
                                            text: 'JR INGENIERÍA ELÉCTRICA • MATRIZ GENERAL DE AUTORIZACIONES POR ROL',
                                            size: 16,
                                            color: '64748B',
                                            font: 'Calibri'
                                        })
                                    ]
                                })
                            ]
                        })
                    },
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: 'JR INGENIERÍA ELÉCTRICA S.A. DE C.V. • SEGURIDAD DE LA INFORMACIÓN • CONFIDENCIAL',
                                            size: 15,
                                            color: '94A3B8',
                                            font: 'Calibri'
                                        })
                                    ]
                                }),
                                new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                        new TextRun({ text: 'Página ', size: 15, color: '64748B', font: 'Calibri' }),
                                        new TextRun({ children: [PageNumber.CURRENT], size: 15, bold: true, color: '64748B', font: 'Calibri' }),
                                        new TextRun({ text: ' de ', size: 15, color: '64748B', font: 'Calibri' }),
                                        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, bold: true, color: '64748B', font: 'Calibri' })
                                    ]
                                })
                            ]
                        })
                    },
                    children
                }
            ]
        });

        const blob = await Packer.toBlob(doc);
        const nombreArchivo = `Matriz_Autorizaciones_Roles_${this.formatearFechaArchivo(new Date())}.docx`;
        saveAs(blob, nombreArchivo);
    }

    // =========================================================================
    // UTILIDADES PRIVADAS
    // =========================================================================

    private determinarNivelAcceso(permisosIds: number[]): { texto: string; colorHex: string } {
        if (!permisosIds || permisosIds.length === 0) {
            return { texto: 'Sin Acceso', colorHex: '94A3B8' };
        }

        const tieneVer = permisosIds.includes(1);
        const tieneAgregar = permisosIds.includes(2) || permisosIds.includes(1002);
        const tieneEditar = permisosIds.includes(3) || permisosIds.includes(1004);
        const tieneEliminar = permisosIds.includes(4) || permisosIds.includes(1003);

        if (tieneVer && tieneAgregar && tieneEditar && tieneEliminar) {
            return { texto: 'Control Total', colorHex: '16A34A' }; // green
        }

        if (tieneVer && (tieneAgregar || tieneEditar)) {
            return { texto: 'Edición y Consulta', colorHex: '0284C7' }; // sky
        }

        if (tieneVer && permisosIds.length === 1) {
            return { texto: 'Solo Consulta', colorHex: '475569' }; // slate
        }

        return { texto: 'Personalizado', colorHex: 'D97706' }; // amber
    }

    private construirTablaFirmas(): Table {
        const borderFirma = {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
        };

        const crearCeldaFirma = (titulo: string, cargo: string, departamento: string) => {
            return new TableCell({
                width: { size: 33.3, type: WidthType.PERCENTAGE },
                borders: borderFirma,
                shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: titulo, bold: true, size: 15, color: '475569', font: 'Calibri' })]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 40 },
                        children: [new TextRun({ text: '_______________________________', size: 14, color: 'CBD5E1', font: 'Calibri' })]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: cargo, bold: true, size: 15, color: '0F172A', font: 'Calibri' })]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: departamento, size: 13, color: '94A3B8', font: 'Calibri' })]
                    })
                ]
            });
        };

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 100, right: 100 },
            rows: [
                new TableRow({
                    cantSplit: true,
                    children: [
                        crearCeldaFirma('Elaboró', 'Administrador del Sistema', 'Seguridad Informática'),
                        crearCeldaFirma('Revisó', 'Control Interno / Calidad', 'Auditoría SGC ISO 9001'),
                        crearCeldaFirma('Autorizó', 'Dirección General / Titular', 'JR Ingeniería Eléctrica')
                    ]
                })
            ]
        });
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

