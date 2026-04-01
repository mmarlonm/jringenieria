import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface KardexProducto {
    codigo: string;
    producto: string;
    concepto: string;
    fecha: Date;
    folio: string;
    tipo_Mov: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    almacen_Sucursal: string;
    observaciones_Movimiento: string;
    referencia_Documento: string;
    id_Usuario: string;
}

@Injectable({
    providedIn: 'root'
})
export class ProductKardexService {
    private apiUrl = `${environment.apiUrl}/ReportDashboard`;

    constructor(private _httpClient: HttpClient) { }

    /**
     * Obtiene el kardex de un producto filtrado por parámetros.
     */
    getKardex(
        codigo: string,
        fechaInicio: string,
        fechaFin: string,
        sucursal: string,
        tipoEmpresa: number
    ): Observable<KardexProducto[]> {
        const params = new HttpParams()
            .set('codigo', codigo)
            .set('fechaInicio', fechaInicio)
            .set('fechaFin', fechaFin)
            .set('sucursal', sucursal)
            .set('tipoEmpresa', tipoEmpresa.toString());

        return this._httpClient.get<KardexProducto[]>(`${this.apiUrl}/kardex-producto`, { params });
    }
}
