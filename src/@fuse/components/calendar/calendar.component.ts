import { Component, Input, OnChanges } from '@angular/core';
import {
    CalendarEvent,
    CalendarView,
    CalendarModule,
    DateAdapter
} from 'angular-calendar';
import { TareasCalendarWrapperModule } from 'app/plugins/tareas-calendar-wrapper.module';

@Component({
    selector: 'app-tareas-calendar',
    styleUrls: ['./calendar.component.scss'],
    standalone: true,
    imports: [
        TareasCalendarWrapperModule
    ],
    templateUrl: './calendar.component.html',
})
export class TareasCalendarComponent implements OnChanges {
    @Input() tareas: any[] = [];

    view: CalendarView = CalendarView.Month;
    viewDate: Date = new Date();
    events: CalendarEvent[] = [];

    ngOnChanges(): void {
        this.events = this.tareas.map(t => ({
            title: t.nombre,
            start: new Date(t.fechaInicioEstimada),
            end: new Date(t.fechaFinEstimada),
            color: {
                primary: '#3f51b5',
                secondary: '#c5cae9'
            }
        }));
    }
}
