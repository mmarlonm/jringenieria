import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from 'app/app.component';
import { appConfig } from 'app/app.config';
import { instalarBusquedaEnSelects } from 'app/core/select-busqueda/buscar-en-select';

// Campo de búsqueda en todos los mat-select con muchas opciones
instalarBusquedaEnSelects();

bootstrapApplication(AppComponent, appConfig).catch((err) =>
    console.error(err)
);
