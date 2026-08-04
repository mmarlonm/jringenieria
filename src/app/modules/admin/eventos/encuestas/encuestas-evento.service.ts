import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class EncuestasEventoService {
    private api = environment.apiUrl;

    constructor(private http: HttpClient) {}

    // ─── ASISTENTES ───────────────────────────────────────────────────────────
    guardarEncuestaAsistente(asistenteId: number, dto: any): Observable<any> {
        return this.http.post(`${this.api}/Asistentes/${asistenteId}/encuesta-satisfaccion`, dto);
    }
    getEncuestaAsistente(asistenteId: number): Observable<any> {
        return this.http.get(`${this.api}/Asistentes/${asistenteId}/encuesta-satisfaccion`);
    }
    getEncuestasAsistentesEvento(eventoId: number): Observable<any> {
        return this.http.get(`${this.api}/Asistentes/encuestas-evento/${eventoId}`);
    }

    // ─── ENVÍO / TRACKING ────────────────────────────────────────────────────
    enviarEncuestasMasivo(eventoId: number): Observable<any> {
        return this.http.post(`${this.api}/Asistentes/encuesta/enviar-masivo/${eventoId}`, {});
    }
    reenviarEncuesta(asistenteId: number): Observable<any> {
        return this.http.post(`${this.api}/Asistentes/encuesta/reenviar/${asistenteId}`, {});
    }
    getKpis(eventoId: number): Observable<any> {
        return this.http.get(`${this.api}/Asistentes/encuesta/kpis/${eventoId}`);
    }
    getTracking(eventoId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.api}/Asistentes/encuesta/tracking/${eventoId}`);
    }

    // ─── FORM PÚBLICO (por token) ─────────────────────────────────────────────
    getEncuestaFormPorToken(token: string): Observable<any> {
        return this.http.get(`${this.api}/Asistentes/encuesta/form/${token}`);
    }
    guardarEncuestaFormPorToken(token: string, dto: any): Observable<any> {
        return this.http.post(`${this.api}/Asistentes/encuesta/form/${token}`, dto);
    }

    // ─── STAFF LOGÍSTICA ─────────────────────────────────────────────────────
    guardarEncuestaStaff(staffId: number, eventoId: number, dto: any): Observable<any> {
        return this.http.post(`${this.api}/PersonalStaff/${staffId}/encuesta-satisfaccion?eventoId=${eventoId}`, dto);
    }
    getEncuestaStaff(staffId: number, eventoId: number): Observable<any> {
        return this.http.get(`${this.api}/PersonalStaff/${staffId}/encuesta-satisfaccion?eventoId=${eventoId}`);
    }
    getEncuestasStaffEvento(eventoId: number): Observable<any> {
        return this.http.get(`${this.api}/PersonalStaff/encuestas-evento/${eventoId}`);
    }

    // ─── STAFF ACOMPAÑAMIENTO ────────────────────────────────────────────────
    guardarEncuestaAcompanamiento(staffId: number, eventoId: number, dto: any): Observable<any> {
        return this.http.post(`${this.api}/PersonalStaff/${staffId}/encuesta-acompanamiento?eventoId=${eventoId}`, dto);
    }
    getEncuestaAcompanamiento(staffId: number, eventoId: number): Observable<any> {
        return this.http.get(`${this.api}/PersonalStaff/${staffId}/encuesta-acompanamiento?eventoId=${eventoId}`);
    }
    getEncuestasAcompanamientoEvento(eventoId: number): Observable<any> {
        return this.http.get(`${this.api}/PersonalStaff/encuestas-acompanamiento-evento/${eventoId}`);
    }

    // ─── EXPORTAR CSV ────────────────────────────────────────────────────────
    exportarCsv(eventoId: number): void {
        this.getEncuestasAsistentesEvento(eventoId).subscribe((rows: any[]) => {
            if (!rows?.length) return;
            const cols = ['Asistente', 'Perfil', 'ExpGeneral', 'ContactosValor', 'AlianzaJR',
                'InteresForoEnergiza', 'OrganizacionCumple', 'NPS', 'Mejora', 'Participacion', 'QuiereContacto', 'Fecha'];
            const lines = [cols.join(',')];
            rows.forEach(r => lines.push([
                `"${r.nombreAsistente}"`, r.perfil || '', r.expGeneral || '', r.contactosValor || '',
                r.alianzaJR || '', r.interesForoEnergiza || '', r.organizacionCumple || '',
                r.npsRecomendacion || '', `"${(r.queMejorar || '').replace(/"/g, "'")}"`,
                `"${r.participacionFutura || ''}"`, r.quiereContacto ? 'Sí' : 'No',
                r.fechaRespuesta ? new Date(r.fechaRespuesta).toLocaleDateString('es-MX') : ''
            ].join(',')));
            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `encuestas-evento-${eventoId}.csv`;
            a.click();
        });
    }
}
