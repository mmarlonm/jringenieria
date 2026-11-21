import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ProcesoComercialService } from 'app/shared/proceso-comercial/proceso-comercial.service';
import { Lead, LeadArchivo, LeadSeguimiento, LeadsService } from '../leads.service';
import { LeadVerDialogComponent } from './lead-ver-dialog.component';

function leadFicticio(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 5,
    nombreContacto: 'Contacto Ficticio',
    empresa: 'Empresa Ficticia SA',
    telefono: '5551234567',
    email: 'contacto@ficticio.com',
    fuenteLead: 'WhatsApp',
    necesidadInicial: 'Cotizar una subestación eléctrica',
    sucursalQueRecibe: 'Pachuca',
    estatus: 'Nuevo',
    idUsuarioAsignado: 3,
    usuarioAsignadoNombre: 'Responsable Ficticio',
    fechaRegistro: '2026-11-10T10:00:00',
    ...overrides
  };
}

const archivo: LeadArchivo = { id: 1, leadId: 5, nombreArchivo: 'plano.pdf', rutaArchivo: 'x', categoria: 'Planos', fechaSubida: '2026-11-10T10:00:00' };
const seguimiento: LeadSeguimiento = {
  id: 1, leadId: 5, fechaContacto: '2026-11-11T09:00:00', medioUtilizado: 'Llamada', avanceLogrado: 'Se agendó visita',
  informacionFaltante: 'Plano de planta', proximaAction: 'Visitar el sitio', fechaCompromiso: '2026-11-15T00:00:00',
  idResponsable: 3, responsableNombre: 'Responsable Ficticio', fechaRegistro: '2026-11-11T09:00:00'
};

describe('LeadVerDialogComponent', () => {
  let fixture: ComponentFixture<LeadVerDialogComponent>;
  let leadsMock: jasmine.SpyObj<LeadsService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<LeadVerDialogComponent>>;
  let routerMock: jasmine.SpyObj<Router>;
  let matDialogMock: jasmine.SpyObj<MatDialog>;
  let procesoMock: { obtener: jasmine.Spy };

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function abrir(lead: Lead): void {
    TestBed.configureTestingModule({
      imports: [LeadVerDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { lead } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: LeadsService, useValue: leadsMock },
        { provide: Router, useValue: routerMock },
        { provide: MatDialog, useValue: matDialogMock },
        { provide: ProcesoComercialService, useValue: procesoMock }
      ]
    });
    fixture = TestBed.createComponent(LeadVerDialogComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    leadsMock = jasmine.createSpyObj('LeadsService', ['getArchivosLead', 'getSeguimientosLead', 'descargarArchivoLead', 'convertirARequerimiento', 'discardLead', 'convertLead']);
    leadsMock.getArchivosLead.and.returnValue(of([archivo]));
    leadsMock.getSeguimientosLead.and.returnValue(of([seguimiento]));
    leadsMock.descargarArchivoLead.and.returnValue('http://api/Leads/5/archivos/1/descargar');
    leadsMock.convertirARequerimiento.and.returnValue(of({ requerimientoId: 10, folio: 'REQ-2026-0001' }));
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    procesoMock = { obtener: jasmine.createSpy('obtener').and.returnValue(of({ actual: 'lead', mensaje: 'Lead nuevo', pasos: [] })) };
  });

  it('muestra los datos del lead en solo lectura', () => {
    abrir(leadFicticio());

    expect(el().querySelectorAll('input, textarea, select').length).toBe(0);
    expect(el().textContent).toContain('Contacto Ficticio');
    expect(el().textContent).toContain('Empresa Ficticia SA');
    expect(el().textContent).toContain('5551234567');
    expect(el().textContent).toContain('contacto@ficticio.com');
    expect(el().textContent).toContain('Cotizar una subestación eléctrica');
    expect(el().textContent).toContain('Responsable Ficticio');
    expect(el().textContent).toContain('Pachuca');
  });

  it('muestra el usuario asignado tanto en la cabecera como en recepcion', () => {
    abrir(leadFicticio({ usuarioAsignadoNombre: 'Ing. Carlos Mendoza' }));

    const campoAsignado = el().querySelector('[data-testid="campo-usuario-asignado"]');
    expect(campoAsignado?.textContent).toContain('Ing. Carlos Mendoza');
    expect(el().textContent).toContain('Asignado a: Ing. Carlos Mendoza');
  });

  it('resuelve el usuario asignado desde users si usuarioAsignadoNombre viene vacio', () => {
    const leadSinNombre = leadFicticio({ idUsuarioAsignado: 42, usuarioAsignadoNombre: undefined });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LeadVerDialogComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { lead: leadSinNombre, users: [{ usuarioId: 42, nombreUsuario: 'Laura Vendedora' }] } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: LeadsService, useValue: leadsMock },
        { provide: Router, useValue: routerMock },
        { provide: MatDialog, useValue: matDialogMock },
        { provide: ProcesoComercialService, useValue: procesoMock }
      ]
    });
    fixture = TestBed.createComponent(LeadVerDialogComponent);
    fixture.detectChanges();

    expect(el().textContent).toContain('Laura Vendedora');
  });

  it('muestra en que proceso va el lead', () => {
    abrir(leadFicticio());

    expect(procesoMock.obtener).toHaveBeenCalledWith('lead', 5);
    expect(el().querySelector('app-proceso-comercial')).not.toBeNull();
  });

  it('un lead nuevo no muestra calificacion ni motivo de descarte', () => {
    abrir(leadFicticio({ estatus: 'Nuevo' }));

    expect(el().querySelector('.calificacion')).toBeNull();
    expect(el().querySelector('.motivo-descarte')).toBeNull();
    expect(el().querySelector('.estatus-lead')?.textContent?.trim()).toBe('Nuevo');
  });

  it('un lead calificado muestra su calificacion ISO', () => {
    abrir(leadFicticio({
      estatus: 'Oportunidad', tipoCliente: 'Industrial', tipoNecesidad: 'Producto', zonaAtencion: 'Pachuca',
      nivelPrioridad: 'Alta', potencialPreliminar: 'Estratégico', fechaCalificacion: '2026-11-12T08:00:00'
    }));

    const calificacion = el().querySelector('.calificacion');
    expect(calificacion).not.toBeNull();
    expect(calificacion!.textContent).toContain('Industrial');
    expect(calificacion!.textContent).toContain('Estratégico');
    expect(calificacion!.textContent).toContain('Alta');
    expect(el().querySelector('.estatus-lead')?.textContent?.trim()).toBe('Calificado');
  });

  it('un lead descartado muestra su motivo de descarte', () => {
    abrir(leadFicticio({ estatus: 'Descartado', motivoDescarte: 'No tiene presupuesto', fechaActualizacion: '2026-11-13T12:00:00' }));

    expect(el().querySelector('.motivo-descarte')?.textContent).toContain('No tiene presupuesto');
    expect(el().querySelector('.calificacion')).toBeNull();
  });

  it('lista los archivos y los seguimientos del lead', () => {
    abrir(leadFicticio());

    expect(leadsMock.getArchivosLead).toHaveBeenCalledWith(5);
    expect(leadsMock.getSeguimientosLead).toHaveBeenCalledWith(5);
    expect(el().querySelector('.archivo')?.textContent).toContain('plano.pdf');
    const seg = el().querySelector('.seguimiento')?.textContent ?? '';
    expect(seg).toContain('Llamada');
    expect(seg).toContain('Se agendó visita');
    expect(seg).toContain('Plano de planta');
    expect(seg).toContain('Visitar el sitio');
  });

  it('sin archivos ni seguimientos lo dice', () => {
    leadsMock.getArchivosLead.and.returnValue(of([]));
    leadsMock.getSeguimientosLead.and.returnValue(of([]));
    abrir(leadFicticio());

    expect(el().textContent).toContain('Sin archivos adjuntos.');
    expect(el().textContent).toContain('Sin seguimientos registrados.');
  });

  it('si fallan los archivos muestra el error con Reintentar y no se queda en silencio', () => {
    leadsMock.getArchivosLead.and.returnValue(throwError(() => ({ error: { mensaje: 'Sin permiso.' } })));
    abrir(leadFicticio());

    expect(el().querySelector('.archivos-error')?.textContent).toContain('Sin permiso.');
    expect(el().querySelector('.archivo')).toBeNull();

    leadsMock.getArchivosLead.and.returnValue(of([archivo]));
    (el().querySelector('.reintentar-archivos') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el().querySelector('.archivos-error')).toBeNull();
    expect(el().querySelector('.archivo')?.textContent).toContain('plano.pdf');
  });

  it('si fallan los seguimientos usa un mensaje generico y se puede reintentar', () => {
    leadsMock.getSeguimientosLead.and.returnValue(throwError(() => new Error('red')));
    abrir(leadFicticio());

    expect(el().querySelector('.seguimientos-error')?.textContent).toContain('No se pudieron cargar los seguimientos.');

    leadsMock.getSeguimientosLead.and.returnValue(of([seguimiento]));
    (el().querySelector('.reintentar-seguimientos') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el().querySelector('.seguimientos-error')).toBeNull();
    expect(el().querySelectorAll('.seguimiento').length).toBe(1);
  });

  it('Cerrar cierra el dialogo', () => {
    abrir(leadFicticio());

    (el().querySelector('.btn-cerrar') as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('descargar un archivo usa la ruta de descarga del lead', () => {
    abrir(leadFicticio());
    const clic = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();

    (el().querySelector('.descargar-archivo') as HTMLButtonElement).click();

    expect(leadsMock.descargarArchivoLead).toHaveBeenCalledWith(5, 1);
    expect(clic).toHaveBeenCalled();
  });

  it('muestra botones Convertir en Requerimiento, Calificar ISO y Descartado si es Nuevo y no tiene requerimiento', () => {
    abrir(leadFicticio({ estatus: 'Nuevo', requerimientoFolio: undefined }));

    expect(el().querySelector('.btn-convertir-req')).not.toBeNull();
    expect(el().querySelector('.btn-calificar')).not.toBeNull();
    expect(el().querySelector('.btn-descartar')).not.toBeNull();
    expect(el().querySelector('.btn-ir-req')).toBeNull();
  });

  it('calificarLead abre el dialogo de calificacion ISO y recarga al confirmar', () => {
    abrir(leadFicticio({ estatus: 'Nuevo', requerimientoFolio: undefined }));
    (fixture.componentInstance as any).dialog = matDialogMock;
    leadsMock.convertLead.and.returnValue(of(leadFicticio({ estatus: 'Oportunidad' })));
    matDialogMock.open.and.returnValue({
      afterClosed: () => of({ action: 'convert', data: { tipoCliente: 'Industrial', tipoNecesidad: 'Proyectos' } })
    } as any);

    (el().querySelector('.btn-calificar') as HTMLButtonElement).click();

    expect(matDialogMock.open).toHaveBeenCalledWith(
      jasmine.any(Function),
      jasmine.objectContaining({ data: jasmine.objectContaining({ action: 'convert' }) })
    );
    expect(leadsMock.convertLead).toHaveBeenCalled();
  });

  it('muestra boton Ver Requerimiento cuando el lead ya tiene requerimientoFolio asignado', () => {
    abrir(leadFicticio({ estatus: 'Oportunidad', requerimientoFolio: 'REQ-2026-0099' }));

    expect(el().querySelector('.btn-ir-req')).not.toBeNull();
    expect(el().querySelector('.btn-ir-req')?.textContent).toContain('REQ-2026-0099');
    expect(el().querySelector('.btn-convertir-req')).toBeNull();
    expect(el().querySelector('.btn-descartar')).toBeNull();
  });

  it('irARequerimiento navega a la ruta de requerimientos con el queryParam folio', () => {
    abrir(leadFicticio({ estatus: 'Oportunidad', requerimientoFolio: 'REQ-2026-0099' }));

    (el().querySelector('.btn-ir-req') as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalledWith({ accion: 'navegar', folio: 'REQ-2026-0099' });
    expect(routerMock.navigate).toHaveBeenCalledWith(['/crm/requerimientos'], { queryParams: { folio: 'REQ-2026-0099' } });
  });
});
