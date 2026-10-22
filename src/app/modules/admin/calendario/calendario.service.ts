import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

/** Calendario de Google del usuario, propio o compartido. */
export interface CalendarioGoogle {
    id: string;
    nombre: string;
    color: string;
    rol: string;
    esPrincipal: boolean;
    seleccionado: boolean;
}

/** Evento normalizado por el API (Google Calendar). */
export interface EventoGoogle {
    id: string;
    calendarioId: string;
    titulo: string;
    inicio: string;
    fin: string;
    esTodoElDia: boolean;
    ubicacion: string | null;
    enlace: string | null;
    color: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarioService {
    private readonly base = `${environment.apiUrl}/mi-calendario`;

    constructor(private http: HttpClient) {}

    calendarios(): Observable<CalendarioGoogle[]> {
        return this.http.get<CalendarioGoogle[]>(`${this.base}/calendarios`);
    }

    eventos(desde: Date, hasta: Date, calendarioIds: string[]): Observable<EventoGoogle[]> {
        return this.http.get<EventoGoogle[]>(`${this.base}/eventos`, {
            params: {
                desde: this.fechaLocal(desde),
                hasta: this.fechaLocal(hasta),
                calendarios: calendarioIds.join(','),
            },
        });
    }

    /** "yyyy-MM-ddTHH:mm:ss" en hora local, para que el API interprete el rango en la hora del usuario. */
    private fechaLocal(d: Date): string {
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }
}
