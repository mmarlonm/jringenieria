import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CalendarioGoogle, CalendarioService, EventoGoogle } from './calendario.service';
import { agruparPorDia, claveDia, guardarSeleccion, horaCorta, inicioSemana, leerSeleccion, sumarDias } from './calendario.utils';

interface DiaSemana {
    fecha: Date;
    clave: string;
    eventos: EventoGoogle[];
}

/** Calendario de Google del usuario: semana completa con sus calendarios propios y compartidos. */
@Component({
    selector: 'calendario-page',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './calendario.component.html',
})
export class CalendarioComponent implements OnInit {
    semana = inicioSemana(new Date());
    dias: DiaSemana[] = [];
    calendarios: CalendarioGoogle[] = [];
    cargando = false;
    error = '';
    horaCorta = horaCorta;
    claveHoy = claveDia(new Date());

    constructor(private calendario: CalendarioService, private cdr: ChangeDetectorRef) {}

    abrirEvento(evento: EventoGoogle): void {
        if (evento.enlace) window.open(evento.enlace, '_blank', 'noopener');
    }

    ngOnInit(): void {
        this.cargarCalendarios();
    }

    get misCalendarios(): CalendarioGoogle[] {
        return this.calendarios.filter(c => c.rol === 'owner');
    }

    get otrosCalendarios(): CalendarioGoogle[] {
        return this.calendarios.filter(c => c.rol !== 'owner');
    }

    get rangoTexto(): string {
        const fin = sumarDias(this.semana, 6);
        const mes = (d: Date) => d.toLocaleDateString('es-MX', { month: 'short' });
        return `${this.semana.getDate()} ${mes(this.semana)} – ${fin.getDate()} ${mes(fin)} ${fin.getFullYear()}`;
    }

    cambiarSemana(semanas: number): void {
        this.semana = sumarDias(this.semana, semanas * 7);
        this.cargarEventos();
    }

    irAHoy(): void {
        this.semana = inicioSemana(new Date());
        this.cargarEventos();
    }

    alternarCalendario(cal: CalendarioGoogle): void {
        cal.seleccionado = !cal.seleccionado;
        guardarSeleccion(this.calendarios.filter(c => c.seleccionado).map(c => c.id));
        this.cargarEventos();
    }

    cargarCalendarios(): void {
        this.cargando = true;
        this.error = '';
        this.calendario.calendarios().subscribe({
            next: lista => {
                const seleccion = leerSeleccion(lista);
                this.calendarios = lista.map(c => ({ ...c, seleccionado: seleccion.includes(c.id) }));
                this.cargarEventos();
            },
            error: (err: HttpErrorResponse) => this.mostrarError(err),
        });
    }

    cargarEventos(): void {
        this.construirDias([]);
        const ids = this.calendarios.filter(c => c.seleccionado).map(c => c.id);
        if (ids.length === 0) {
            this.cargando = false;
            this.cdr.markForCheck();
            return;
        }
        this.cargando = true;
        this.error = '';
        const hasta = sumarDias(this.semana, 7);
        this.calendario.eventos(this.semana, hasta, ids).subscribe({
            next: evs => {
                this.construirDias(evs);
                this.cargando = false;
                this.cdr.markForCheck();
            },
            error: (err: HttpErrorResponse) => this.mostrarError(err),
        });
    }

    private construirDias(eventos: EventoGoogle[]): void {
        const porDia = agruparPorDia(eventos);
        this.dias = Array.from({ length: 7 }, (_, i) => {
            const fecha = sumarDias(this.semana, i);
            const clave = claveDia(fecha);
            return { fecha, clave, eventos: porDia.get(clave) ?? [] };
        });
    }

    private mostrarError(err: HttpErrorResponse): void {
        this.construirDias([]);
        this.cargando = false;
        this.error = err.status === 409
            ? (err.error?.mensaje || 'Conecta tu cuenta de Google para ver tu calendario.')
            : 'No se pudo cargar el calendario. Intenta de nuevo.';
        this.cdr.markForCheck();
    }
}
