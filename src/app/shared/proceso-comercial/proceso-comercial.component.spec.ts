import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ProcesoComercialComponent } from './proceso-comercial.component';
import { ProcesoComercialService } from './proceso-comercial.service';
import { ProcesoComercial } from './proceso-comercial.types';

// Respuesta tal como la manda el API (camelCase), con un requerimiento tecnico aprobado que ya va en Ingenieria
function respuestaApi(): ProcesoComercial {
  return {
    actual: 'ingenieria',
    mensaje: 'Va en Ingeniería, etapa Levantamiento técnico. Después sigue la cotización.',
    pasos: [
      { clave: 'lead', titulo: 'Lead', estado: 'completado', detalle: 'Empresa Ficticia · Calificado', id: 1 },
      { clave: 'requerimiento', titulo: 'Requerimiento', estado: 'completado', detalle: 'REQ-2026-0007 · Aprobado', id: 7 },
      { clave: 'ingenieria', titulo: 'Ingeniería', estado: 'actual', detalle: 'Caso #12 · Levantamiento técnico', id: 12 },
      { clave: 'cotizacion', titulo: 'Cotización', estado: 'pendiente', detalle: 'Después de Ingeniería', id: null }
    ]
  };
}

describe('ProcesoComercialComponent', () => {
  let fixture: ComponentFixture<ProcesoComercialComponent>;
  let componente: ProcesoComercialComponent;
  let obtener: jasmine.Spy<(tipo: any, id: number) => Observable<ProcesoComercial>>;

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function mostrar(tipo: any, id: number | null | undefined): void {
    componente.tipo = tipo;
    componente.id = id;
    componente.ngOnChanges();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    obtener = jasmine.createSpy('obtener').and.returnValue(of(respuestaApi()));
    await TestBed.configureTestingModule({
      imports: [ProcesoComercialComponent, MatIconTestingModule],
      providers: [{ provide: ProcesoComercialService, useValue: { obtener } }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcesoComercialComponent);
    componente = fixture.componentInstance;
  });

  it('no pide nada ni dibuja nada sin tipo o sin id', () => {
    mostrar('requerimiento', null);
    mostrar(null, 5);
    mostrar('lead', 0);

    expect(obtener).not.toHaveBeenCalled();
    expect(el().querySelector('.proceso-comercial')).toBeNull();
  });

  it('pide el proceso del registro y dibuja los cuatro pasos en orden', () => {
    mostrar('requerimiento', 7);

    expect(obtener).toHaveBeenCalledOnceWith('requerimiento', 7);
    const pasos = Array.from(el().querySelectorAll('.proceso-paso'));
    expect(pasos.map(p => p.getAttribute('data-paso'))).toEqual(['lead', 'requerimiento', 'ingenieria', 'cotizacion']);
    expect(pasos.map(p => p.getAttribute('data-estado'))).toEqual(['completado', 'completado', 'actual', 'pendiente']);
  });

  it('muestra el detalle de cada paso y el mensaje de que sigue', () => {
    mostrar('lead', 1);

    const detalles = Array.from(el().querySelectorAll('.paso-detalle')).map(d => d.textContent?.trim());
    expect(detalles).toEqual([
      'Empresa Ficticia · Calificado',
      'REQ-2026-0007 · Aprobado',
      'Caso #12 · Levantamiento técnico',
      'Después de Ingeniería'
    ]);
    expect(el().querySelector('.proceso-mensaje')?.textContent).toContain('Va en Ingeniería, etapa Levantamiento técnico');
  });

  it('marca solo el paso actual con aria-current y le pone la etiqueta "Aquí va"', () => {
    mostrar('caso', 12);

    const actuales = el().querySelectorAll('.proceso-paso[aria-current="step"]');
    expect(actuales.length).toBe(1);
    expect(actuales[0].getAttribute('data-paso')).toBe('ingenieria');
    expect(actuales[0].querySelector('.paso-estado')?.textContent?.trim()).toBe('Aquí va');
  });

  it('muestra la etiqueta de cada estado', () => {
    obtener.and.returnValue(of({
      actual: 'lead', mensaje: '', pasos: [
        { clave: 'lead', titulo: 'Lead', estado: 'detenido', detalle: 'x' },
        { clave: 'requerimiento', titulo: 'Requerimiento', estado: 'noAplica', detalle: 'x' },
        { clave: 'ingenieria', titulo: 'Ingeniería', estado: 'pendiente', detalle: 'x' },
        { clave: 'cotizacion', titulo: 'Cotización', estado: 'completado', detalle: 'x' }
      ]
    } as ProcesoComercial));
    mostrar('lead', 1);

    const etiquetas = Array.from(el().querySelectorAll('.paso-estado')).map(e => e.textContent?.trim());
    expect(etiquetas).toEqual(['Detenido', 'No aplica', 'Pendiente', 'Completado']);
  });

  it('indica que esta cargando mientras espera la respuesta', () => {
    const pendiente = new Subject<ProcesoComercial>();
    obtener.and.returnValue(pendiente.asObservable());

    mostrar('cotizacion', 40);

    expect(el().querySelector('.proceso-cargando')).not.toBeNull();
    expect(el().querySelector('.proceso-paso')).toBeNull();

    pendiente.next(respuestaApi());
    fixture.detectChanges();
    expect(el().querySelector('.proceso-cargando')).toBeNull();
    expect(el().querySelectorAll('.proceso-paso').length).toBe(4);
  });

  it('si falla muestra el mensaje del API con Reintentar y no se queda vacio en silencio', () => {
    obtener.and.returnValue(throwError(() => ({ error: { mensaje: 'No se encontró el registro.' } })));

    mostrar('requerimiento', 9999);

    expect(el().querySelector('.proceso-error')?.textContent).toContain('No se encontró el registro.');
    expect(el().querySelector('.proceso-reintentar')).not.toBeNull();
    expect(el().querySelector('.proceso-paso')).toBeNull();
  });

  it('si falla sin mensaje del API usa uno generico', () => {
    obtener.and.returnValue(throwError(() => new Error('red')));

    mostrar('lead', 1);

    expect(el().querySelector('.proceso-error')?.textContent).toContain('No se pudo cargar el proceso.');
  });

  it('Reintentar vuelve a pedir el proceso y lo dibuja', () => {
    obtener.and.returnValues(throwError(() => new Error('red')), of(respuestaApi()));
    mostrar('lead', 1);

    (el().querySelector('.proceso-reintentar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(obtener).toHaveBeenCalledTimes(2);
    expect(el().querySelector('.proceso-error')).toBeNull();
    expect(el().querySelectorAll('.proceso-paso').length).toBe(4);
  });

  it('al cambiar de registro descarta la respuesta tardia del anterior', () => {
    const primero = new Subject<ProcesoComercial>();
    const segundo = new Subject<ProcesoComercial>();
    obtener.and.returnValues(primero.asObservable(), segundo.asObservable());

    mostrar('requerimiento', 1);
    mostrar('requerimiento', 2);
    const nueva = respuestaApi();
    nueva.mensaje = 'Mensaje del segundo';
    segundo.next(nueva);
    const vieja = respuestaApi();
    vieja.mensaje = 'Mensaje del primero';
    primero.next(vieja);
    fixture.detectChanges();

    expect(el().querySelector('.proceso-mensaje')?.textContent).toContain('Mensaje del segundo');
    expect(el().textContent).not.toContain('Mensaje del primero');
  });

  it('al cambiar a un registro sin id limpia lo mostrado', () => {
    mostrar('requerimiento', 7);
    expect(el().querySelectorAll('.proceso-paso').length).toBe(4);

    mostrar('requerimiento', undefined);

    expect(el().querySelector('.proceso-comercial')).toBeNull();
  });
});
