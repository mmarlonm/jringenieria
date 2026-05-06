import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from 'environments/environment';
import { MaterialEntregaDto, RegistroEntregaDto, MaestroEntregaDto } from './models/control-entregas.types';

@Injectable({
    providedIn: 'root'
})
export class ControlEntregasService {
    private apiUrl = `${environment.apiUrl}/ControlSurtidos`;
    private erpUrl = `${environment.apiUrl}/SolicitudesCompra`;

    constructor(private _httpClient: HttpClient) { }

    /**
     * Obtiene el listado maestro de folios configurados (Estructura Jerárquica)
     */
    obtenerMaestroEntregas(): Observable<MaestroEntregaDto[]> {
        return this._httpClient.get<any[]>(this.apiUrl).pipe(
            map(maestros => {
                return maestros.map(m => {
                    const partidas = m.partidas || [];
                    const cantidadTotal = partidas.reduce((acc, p) => acc + (p.cantidadFacturada || 0), 0);
                    const entregadoTotal = partidas.reduce((acc, p) => acc + (p.surtidoAcumulado || 0), 0);
                    const saldoTotal = partidas.reduce((acc, p) => acc + (p.surtidoPendiente || 0), 0);

                    let estatus: 'COMPLETO' | 'PARCIAL' | 'PENDIENTE' = 'PENDIENTE';
                    if (saldoTotal <= 0 && cantidadTotal > 0) estatus = 'COMPLETO';
                    else if (entregadoTotal > 0) estatus = 'PARCIAL';

                    return {
                        idFacturaMaestro: m.idFacturaMaestro,
                        folio: m.folioFactura,
                        cliente: m.nombreCliente,
                        itemsCount: partidas.length,
                        cantidadTotal: cantidadTotal,
                        entregadoTotal: entregadoTotal,
                        saldoTotal: saldoTotal,
                        estatus: estatus,
                        ultimaSincronizacion: m.updatedDate || m.createdDate || m.fechaFacturacion || new Date(),
                        fechaFacturacion: m.fechaFacturacion
                    };
                });
            }),
            catchError(() => {
                const mock: MaestroEntregaDto[] = [
                    { idFacturaMaestro: 1, folio: 'MOCK-96', cliente: 'PRUEBA MOCK', itemsCount: 7, cantidadTotal: 63, entregadoTotal: 0, saldoTotal: 63, estatus: 'PENDIENTE', ultimaSincronizacion: new Date() }
                ];
                return of(mock);
            })
        );
    }

    /**
     * Obtiene los materiales de una factura (desde CONTPAQi/ERP)
     */
    obtenerMaterialesPorFolio(folio: string): Observable<MaterialEntregaDto[]> {
        return this._httpClient.get<any[]>(`${this.erpUrl}/obtener-detalle-materiales`, {
            params: { identificador: folio }
        }).pipe(
            map(response => this._mapERPResponse(response, folio)),
            catchError(() => {
                const mock = [
                    { materialServicio: "PRODUCTO ERP A", cantidad: 10 },
                    { materialServicio: "PRODUCTO ERP B", cantidad: 5 }
                ];
                return of(this._mapERPResponse(mock, folio));
            })
        );
    }

    private _mapERPResponse(items: any[], folio: string): MaterialEntregaDto[] {
        return items.map((item, index) => ({
            folioFactura: folio,
            nombreCliente: item.cliente || 'CLIENTE ERP',
            idPartida: 0,
            numeroPartida: index + 1,
            codigoProducto: item.materialServicio || item.codigoProducto || '',
            descripcion: item.descripcion || item.materialServicio || '',
            cantidadFacturada: item.cantidad || item.cantidadFacturada || 0,
            historialSurtidos: [],
            surtidoAcumulado: 0,
            surtidoPendiente: item.cantidad || item.cantidadFacturada || 0,
            status: 'PENDIENTE'
        }));
    }

    /**
     * Obtiene el detalle de materiales para un folio existente
     */
    obtenerDetalleEntregas(folio: string): Observable<MaterialEntregaDto[]> {
        return this._httpClient.get<any[]>(this.apiUrl).pipe(
            map(maestros => {
                const maestro = maestros.find(m => m.folioFactura === folio);
                if (!maestro) return [];
                
                return (maestro.partidas || []).map(p => ({
                    folioFactura: maestro.folioFactura,
                    nombreCliente: maestro.nombreCliente,
                    idPartida: p.idPartida,
                    numeroPartida: p.numeroPartida,
                    codigoProducto: p.codigoProducto,
                    descripcion: p.descripcion,
                    cantidadFacturada: p.cantidadFacturada,
                    historialSurtidos: p.historialSurtidos || [],
                    surtidoAcumulado: p.surtidoAcumulado || 0,
                    surtidoPendiente: p.surtidoPendiente || 0,
                    status: (p.surtidoPendiente <= 0) ? 'COMPLETO' : (p.surtidoAcumulado > 0 ? 'PARCIAL' : 'PENDIENTE')
                }));
            }),
            catchError(() => {
                return of([]);
            })
        );
    }

    /**
     * Crea una nueva configuración de factura en nuestra DB
     */
    crearConfiguracion(maestro: any): Observable<any> {
        return this._httpClient.post(`${this.apiUrl}/guardar`, maestro);
    }

    /**
     * Actualiza una factura existente
     */
    actualizarConfiguracion(idUsuario: number, maestro: any): Observable<any> {
        return this._httpClient.put(`${this.apiUrl}/${idUsuario}`, maestro);
    }

    /**
     * Elimina una configuración
     */
    eliminarConfiguracion(id: number): Observable<any> {
        return this._httpClient.delete(`${this.apiUrl}/${id}`);
    }

    /**
     * Registra una nueva entrega parcial
     */
    registrarEntrega(datos: RegistroEntregaDto): Observable<any> {
        return this._httpClient.post(`${this.apiUrl}/registrar-entrega`, datos);
    }
}
