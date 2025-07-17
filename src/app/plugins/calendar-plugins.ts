// src/app/shared/calendar/calendar-plugins.ts
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// Registra los plugins una sola vez
FullCalendarModule.registerPlugins([
  dayGridPlugin,
  interactionPlugin,
]);
