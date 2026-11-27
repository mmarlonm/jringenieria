import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { saveAs } from 'file-saver';
import {
    PedidoCatalogos,
    PedidoFiltros,
    PedidoListaRespuesta,
    PedidoResumen,
    PedidoKpis,
    PedidoDetalle,
    ActualizarPedidoDto,
    PedidoVerificacionItem,
    ValidarAreaDto,
    LiberarPedidoDto,
    EntregarPedidoDto,
    ReabrirEjecucionDto,
    CerrarPedidoDto,
    CancelarPedidoDto,
    PedidoArchivoItem,
    PedidoFacturacionResumen,
    FacturacionFila,
    GuardarFacturacionFilaDto,
    PedidoModificacionItem,
    RegistrarModificacionDto,
    AprobarModificacionDto,
    PedidoBitacoraItem,
    AgregarBitacoraDto
} from './pedidos.types';

@Injectable({
    providedIn: 'root'
})
export class PedidosService {
    private readonly baseUrl = `${environment.apiUrl}/Pedidos`;

    constructor(private readonly _http: HttpClient) {}

    obtenerCatalogos(): Observable<PedidoCatalogos> {
        return this._http.get<PedidoCatalogos>(`${this.baseUrl}/catalogos`);
    }

    listar(filtros: PedidoFiltros = {}): Observable<PedidoListaRespuesta> {
        let params = new HttpParams();
        if (filtros.desde) params = params.set('desde', filtros.desde);
        if (filtros.hasta) params = params.set('hasta', filtros.hasta);
        if (filtros.unidadId !== undefined && filtros.unidadId !== null) params = params.set('unidadId', filtros.unidadId.toString());
        if (filtros.estatus) params = params.set('estatus', filtros.estatus);
        if (filtros.responsableId !== undefined && filtros.responsableId !== null) params = params.set('responsableId', filtros.responsableId.toString());
        if (filtros.texto) params = params.set('texto', filtros.texto);
        if (filtros.page) params = params.set('page', filtros.page.toString());
        if (filtros.size) params = params.set('size', filtros.size.toString());

        return this._http.get<PedidoListaRespuesta>(this.baseUrl, { params });
    }

    obtenerKpis(filtros?: { desde?: string; hasta?: string; unidadId?: number; responsableId?: number }): Observable<PedidoKpis> {
        let params = new HttpParams();
        if (filtros?.desde) params = params.set('desde', filtros.desde);
        if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
        if (filtros?.unidadId !== undefined && filtros?.unidadId !== null) params = params.set('unidadId', filtros.unidadId.toString());
        if (filtros?.responsableId !== undefined && filtros?.responsableId !== null) params = params.set('responsableId', filtros.responsableId.toString());

        return this._http.get<PedidoKpis>(`${this.baseUrl}/kpis`, { params });
    }

    obtenerPorId(id: number): Observable<PedidoDetalle> {
        return this._http.get<PedidoDetalle>(`${this.baseUrl}/${id}`);
    }

    convertirDesdeCotizacion(cotizacionId: number): Observable<PedidoDetalle> {
        return this._http.post<PedidoDetalle>(`${this.baseUrl}/desde-cotizacion/${cotizacionId}`, {});
    }

    actualizar(id: number, dto: ActualizarPedidoDto): Observable<PedidoDetalle> {
        return this._http.put<PedidoDetalle>(`${this.baseUrl}/${id}`, dto);
    }

    /** El API responde con el pedido completo (no con la lista de puntos). */
    actualizarVerificacion(id: number, verificacion: PedidoVerificacionItem[]): Observable<PedidoDetalle> {
        return this._http.put<PedidoDetalle>(`${this.baseUrl}/${id}/verificacion`, verificacion);
    }

    enviarValidacion(id: number): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/enviar-validacion`, {});
    }

    validarArea(id: number, area: string, dto: ValidarAreaDto): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/validaciones/${area}`, dto);
    }

    liberar(id: number, dto: LiberarPedidoDto): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/liberar`, dto);
    }

    iniciarEjecucion(id: number): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/iniciar-ejecucion`, {});
    }

    entregar(id: number, dto?: EntregarPedidoDto): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/entregar`, dto || {});
    }

    reabrirEjecucion(id: number, dto: ReabrirEjecucionDto): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/reabrir-ejecucion`, dto);
    }

    cerrar(id: number, dto: CerrarPedidoDto): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/cerrar`, dto);
    }

    cancelar(id: number, dto: CancelarPedidoDto): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/cancelar`, dto);
    }

    obtenerArchivos(id: number): Observable<PedidoArchivoItem[]> {
        return this._http.get<PedidoArchivoItem[]>(`${this.baseUrl}/${id}/archivos`);
    }

    subirArchivo(id: number, archivo: File, tipo: string, comentario?: string, modificacionId?: number): Observable<PedidoArchivoItem> {
        const formData = new FormData();
        formData.append('archivo', archivo, archivo.name);
        formData.append('tipo', tipo);
        if (comentario) formData.append('comentario', comentario);
        if (modificacionId !== undefined && modificacionId !== null) formData.append('modificacionId', modificacionId.toString());

        return this._http.post<PedidoArchivoItem>(`${this.baseUrl}/${id}/archivos`, formData);
    }

    descargarArchivo(id: number, archivoId: number): Observable<Blob> {
        return this._http.get(`${this.baseUrl}/${id}/archivos/${archivoId}/descargar`, {
            responseType: 'blob'
        });
    }

    descargarCotizacionArchivo(id: number, archivoId: number): Observable<Blob> {
        return this._http.get(`${this.baseUrl}/${id}/cotizacion-archivos/${archivoId}/descargar`, {
            responseType: 'blob'
        });
    }

    eliminarArchivo(id: number, archivoId: number, motivo: string): Observable<any> {
        return this._http.delete(`${this.baseUrl}/${id}/archivos/${archivoId}`, {
            params: new HttpParams().set('motivo', motivo)
        });
    }

    obtenerFacturacion(id: number): Observable<PedidoFacturacionResumen> {
        return this._http.get<PedidoFacturacionResumen>(`${this.baseUrl}/${id}/facturacion`);
    }

    /** El API responde con el resumen de facturación completo (totales y todas las filas), no con la fila. */
    programarFacturacion(id: number, dto: GuardarFacturacionFilaDto): Observable<PedidoFacturacionResumen> {
        return this._http.post<PedidoFacturacionResumen>(`${this.baseUrl}/${id}/facturacion`, dto);
    }

    actualizarFacturacionFila(id: number, filaId: number, dto: GuardarFacturacionFilaDto): Observable<PedidoFacturacionResumen> {
        return this._http.put<PedidoFacturacionResumen>(`${this.baseUrl}/${id}/facturacion/${filaId}`, dto);
    }

    obtenerModificaciones(id: number): Observable<PedidoModificacionItem[]> {
        return this._http.get<PedidoModificacionItem[]>(`${this.baseUrl}/${id}/modificaciones`);
    }

    registrarModificacion(id: number, dto: RegistrarModificacionDto): Observable<PedidoModificacionItem> {
        return this._http.post<PedidoModificacionItem>(`${this.baseUrl}/${id}/modificaciones`, dto);
    }

    aprobarModificacionCliente(id: number, modId: number, dto: AprobarModificacionDto): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/modificaciones/${modId}/aprobar-cliente`, dto);
    }

    aplicarModificacion(id: number, modId: number): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/modificaciones/${modId}/aplicar`, {});
    }

    cancelarModificacion(id: number, modId: number, motivo: string): Observable<any> {
        return this._http.post(`${this.baseUrl}/${id}/modificaciones/${modId}/cancelar`, { motivo });
    }

    obtenerBitacora(id: number, page: number = 1, size: number = 20): Observable<PedidoBitacoraItem[]> {
        const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
        return this._http.get<PedidoBitacoraItem[]>(`${this.baseUrl}/${id}/bitacora`, { params });
    }

    agregarBitacora(id: number, dto: AgregarBitacoraDto): Observable<PedidoBitacoraItem> {
        return this._http.post<PedidoBitacoraItem>(`${this.baseUrl}/${id}/bitacora`, dto);
    }

    async exportarExcel(items: PedidoResumen[], kpis: PedidoKpis | null): Promise<void> {
        const excelJsModule = await import('exceljs');
        const ExcelJS = (excelJsModule as any).default ?? excelJsModule;
        const workbook = new ExcelJS.Workbook();

        // Hoja 1: Lista
        const sheetLista = workbook.addWorksheet('Lista');
        sheetLista.columns = [
            { header: 'Folio', key: 'folio', width: 16 },
            { header: 'Estatus', key: 'estatus', width: 18 },
            { header: 'Tipo', key: 'tipo', width: 10 },
            { header: 'Tipo Servicio', key: 'tipoServicio', width: 18 },
            { header: 'Prioridad', key: 'prioridad', width: 12 },
            { header: 'Cliente', key: 'clienteNombre', width: 30 },
            { header: 'Sucursal', key: 'sucursalNombre', width: 16 },
            { header: 'Moneda', key: 'moneda', width: 10 },
            { header: 'Monto Pedido', key: 'montoPedido', width: 16 },
            { header: 'Responsable', key: 'responsableNombre', width: 25 },
            { header: 'Cotización', key: 'cotizacionFolio', width: 16 },
            { header: 'Requerimiento', key: 'requerimientoFolio', width: 16 },
            { header: 'No. OC', key: 'numeroOC', width: 16 },
            { header: 'Fecha Registro', key: 'fechaRegistro', width: 20 },
            { header: 'Alertas', key: 'alertas', width: 30 }
        ];

        items.forEach((item) => {
            sheetLista.addRow({
                folio: item.folio,
                estatus: item.estatus,
                tipo: item.tipo,
                tipoServicio: item.tipoServicio,
                prioridad: item.prioridad,
                clienteNombre: item.clienteNombre,
                sucursalNombre: item.sucursalNombre,
                moneda: item.moneda,
                montoPedido: item.montoPedido,
                responsableNombre: item.responsableNombre,
                cotizacionFolio: item.cotizacionFolio,
                requerimientoFolio: item.requerimientoFolio || 'N/A',
                numeroOC: item.numeroOC || '',
                fechaRegistro: item.fechaRegistro ? item.fechaRegistro.slice(0, 19).replace('T', ' ') : '',
                alertas: (item.alertas || []).join('; ')
            });
        });

        // Hoja 2: Resumen
        const sheetResumen = workbook.addWorksheet('Resumen');
        sheetResumen.columns = [
            { header: 'Concepto', key: 'concepto', width: 30 },
            { header: 'Detalle', key: 'detalle', width: 30 },
            { header: 'Cantidad', key: 'cantidad', width: 15 },
            { header: 'Importe Total', key: 'importe', width: 20 }
        ];

        sheetResumen.addRow({ concepto: 'Total Pedidos (Activos)', cantidad: kpis?.total ?? items.length });

        if (kpis?.porEstatus) {
            sheetResumen.addRow({});
            sheetResumen.addRow({ concepto: '--- POR ESTATUS ---' });
            kpis.porEstatus.forEach((e) => {
                const importesStr = (e.importes || []).map((i) => `${i.moneda}: $${i.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`).join(', ');
                sheetResumen.addRow({
                    concepto: 'Estatus',
                    detalle: e.estatus,
                    cantidad: e.cantidad,
                    importe: importesStr
                });
            });
        }

        if (kpis?.porResponsable) {
            sheetResumen.addRow({});
            sheetResumen.addRow({ concepto: '--- POR VENDEDOR / RESPONSABLE ---' });
            kpis.porResponsable.forEach((r) => {
                const importesStr = (r.importes || []).map((i) => `${i.moneda}: $${i.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`).join(', ');
                sheetResumen.addRow({
                    concepto: 'Vendedor',
                    detalle: r.nombre,
                    cantidad: r.cantidad,
                    importe: importesStr
                });
            });
        }

        if (kpis?.porSucursal) {
            sheetResumen.addRow({});
            sheetResumen.addRow({ concepto: '--- POR SUCURSAL ---' });
            kpis.porSucursal.forEach((s) => {
                const importesStr = (s.importes || []).map((i) => `${i.moneda}: $${i.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`).join(', ');
                sheetResumen.addRow({
                    concepto: 'Sucursal',
                    detalle: s.nombre,
                    cantidad: s.cantidad,
                    importe: importesStr
                });
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `Pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
    }
}
