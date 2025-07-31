import { Component, Input, OnChanges } from '@angular/core';

import {
    CalendarEvent,
    CalendarView,
    CalendarModule,
    DateAdapter,
} from 'angular-calendar';
import { TareasCalendarWrapperModule } from 'app/plugins/tareas-calendar-wrapper.module';
import { MatButtonModule } from '@angular/material/button';
@Component({
    selector: 'app-tareas-calendar',
    styleUrls: ['./calendar.component.scss'],
    standalone: true,
    imports: [
        TareasCalendarWrapperModule,
        MatButtonModule
    ],
    templateUrl: './calendar.component.html',
    
})

export class TareasCalendarComponent implements OnChanges {
    @Input() tareas: any[] = [];

    view: CalendarView = CalendarView.Month;
    viewDate: Date = new Date();
    events: CalendarEvent[] = [];
    activeDay: any;


    ngOnChanges(): void {
this.viewDate = new Date()
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
    isToday(date: any): boolean {
  const today = new Date();
  const target = new Date(date); // asegura conversión real

  return (
    target.getDate() === today.getDate() &&
    target.getMonth() === today.getMonth() &&
    target.getFullYear() === today.getFullYear()
  );
}
getDayNumber(date: any): string {
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.getDate().toString();
}
 closeOpenMonthViewDay() {
   
  }

}
