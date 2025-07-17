// src/app/plugins/tareas-calendar-wrapper.module.ts
import { NgModule } from '@angular/core';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

@NgModule({
  imports: [
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
  ],
  exports: [CalendarModule] // para que puedas importarlo desde standalone
})
export class TareasCalendarWrapperModule {}
