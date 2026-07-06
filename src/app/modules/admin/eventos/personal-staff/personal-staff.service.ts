import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface PersonalStaff {
    id: number;
    nombreCompleto: string;
    empresa: string;
    cargo: string;
    correoElectronico: string;
    telefonoOficina?: string;
    telefonoWhatsapp?: string;
    linkWeb?: string;
    tipoPersonal: string; // "Expositor" | "Staff" | "Otro"
    compartirDatos: boolean;
    verTareas: boolean;
    fotoPath?: string;
    tokenQr: string;
    emailEnviado: boolean;
    fechaRegistro: string;
    eventoIds?: number[];
    eventosEmailStatus?: { eventoId: number, emailEnviado: boolean }[];
}

@Injectable({
    providedIn: 'root'
})
export class PersonalStaffService {
    private _http = inject(HttpClient);
    private readonly apiBase = environment.apiUrl;

    getAll(): Observable<PersonalStaff[]> {
        return this._http.get<PersonalStaff[]>(`${this.apiBase}/PersonalStaff`);
    }

    getById(id: number): Observable<PersonalStaff> {
        return this._http.get<PersonalStaff>(`${this.apiBase}/PersonalStaff/${id}`);
    }

    getByTokenQr(tokenQr: string): Observable<PersonalStaff> {
        return this._http.get<PersonalStaff>(`${this.apiBase}/PersonalStaff/public/${tokenQr}`);
    }

    save(personal: any, foto?: File): Observable<PersonalStaff> {
        const formData = new FormData();
        formData.append('id', personal.id ? String(personal.id) : '0');
        formData.append('nombreCompleto', personal.nombreCompleto || '');
        formData.append('empresa', personal.empresa || '');
        formData.append('cargo', personal.cargo || '');
        formData.append('correoElectronico', personal.correoElectronico || '');
        formData.append('telefonoOficina', personal.telefonoOficina || '');
        formData.append('telefonoWhatsapp', personal.telefonoWhatsapp || '');
        formData.append('linkWeb', personal.linkWeb || '');
        formData.append('tipoPersonal', personal.tipoPersonal || 'Expositor');
        formData.append('compartirDatos', String(personal.compartirDatos !== false));
        formData.append('verTareas', String(personal.verTareas === true));
        formData.append('emailEnviado', String(personal.emailEnviado === true));
        if (foto) {
            formData.append('foto', foto, foto.name);
        }
        if (personal.eventoIds && personal.eventoIds.length > 0) {
            personal.eventoIds.forEach((id: number) => {
                formData.append('eventoIds', String(id));
            });
        }
        return this._http.post<PersonalStaff>(`${this.apiBase}/PersonalStaff`, formData);
    }

    delete(id: number): Observable<any> {
        return this._http.delete(`${this.apiBase}/PersonalStaff/${id}`);
    }

    getPhotoUrl(id: number): string {
        return `${this.apiBase}/PersonalStaff/photo/${id}`;
    }

    enviarQrIndividual(id: number, eventoId?: number): Observable<any> {
        const queryParams = eventoId ? `?eventoId=${eventoId}` : '';
        return this._http.post(`${this.apiBase}/PersonalStaff/${id}/enviar-qr${queryParams}`, {});
    }

    enviarQrMasivo(eventoId: number, personalIds?: number[]): Observable<any> {
        return this._http.post(`${this.apiBase}/PersonalStaff/masivo-manual/${eventoId}`, personalIds || null);
    }
}
