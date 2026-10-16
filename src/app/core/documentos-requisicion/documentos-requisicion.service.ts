import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { DocumentacionRequisicion, DocumentoRequisicion } from './documentos-requisicion.types';

/** Documentos (factura, evidencia, comprobante de pago) de una requisición. */
@Injectable({ providedIn: 'root' })
export class DocumentosRequisicionService {
    private _http = inject(HttpClient);

    private url(idSolicitud: number): string {
        return `${environment.apiUrl}/SolicitudesCompra/${idSolicitud}/documentos`;
    }

    obtener(idSolicitud: number): Observable<DocumentacionRequisicion> {
        return this._http.get<DocumentacionRequisicion>(this.url(idSolicitud));
    }

    subir(idSolicitud: number, tipo: string, archivo: File): Observable<DocumentoRequisicion> {
        const form = new FormData();
        form.append('tipo', tipo);
        form.append('archivo', archivo);
        return this._http.post<DocumentoRequisicion>(this.url(idSolicitud), form);
    }

    descargar(idSolicitud: number, idDocumento: number): Observable<Blob> {
        return this._http.get(`${this.url(idSolicitud)}/${idDocumento}/descargar`, { responseType: 'blob' });
    }

    eliminar(idSolicitud: number, idDocumento: number): Observable<{ mensaje: string }> {
        return this._http.delete<{ mensaje: string }>(`${this.url(idSolicitud)}/${idDocumento}`);
    }

    aprobar(idSolicitud: number, idDocumento: number): Observable<DocumentoRequisicion> {
        return this._http.post<DocumentoRequisicion>(`${this.url(idSolicitud)}/${idDocumento}/aprobar`, {});
    }

    rechazar(idSolicitud: number, idDocumento: number, comentario: string): Observable<DocumentoRequisicion> {
        return this._http.post<DocumentoRequisicion>(`${this.url(idSolicitud)}/${idDocumento}/rechazar`, { comentario });
    }
}
